import { config } from "../config/env.js";

/**
 * Haversine formula for calculating spherical distance between two geographic coordinates in kilometers
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

/**
 * Routes Service
 * 1. Checks OpenRouteService (ORS) API when OPENROUTESERVICE_API_KEY is configured.
 * 2. Checks Google Maps Directions API if GOOGLE_MAPS_API_KEY is configured.
 * 3. Accurate local Haversine + road network routing fallback.
 */
export async function getRouteDetails(origin, destination, stops = []) {
  // 1. Try OpenRouteService
  if (config.openRouteService.apiKey) {
    try {
      const coordinates = [
        [origin.lng, origin.lat],
        ...stops.map((s) => [s.lng, s.lat]),
        [destination.lng, destination.lat],
      ];

      const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
        method: "POST",
        headers: {
          Authorization: config.openRouteService.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates,
        }),
      });

      const data = await res.json();
      if (res.ok && data.features && data.features[0]) {
        const feature = data.features[0];
        const summary = feature.properties?.summary || {};
        const distanceKm = Math.round(((summary.distance || 5400) / 1000) * 10) / 10;
        const durationMins = Math.ceil((summary.duration || 600) / 60);

        // Map [lng, lat] coordinates to Leaflet [lat, lng]
        const pathCoords = (feature.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);

        return {
          distanceKm: Math.max(1.0, distanceKm),
          durationMins: Math.max(3, durationMins),
          coordinates: pathCoords,
          provider: "openrouteservice",
          bbox: feature.bbox || null,
        };
      } else {
        console.warn("[OpenRouteService] API error response:", data.error || data);
      }
    } catch (orsErr) {
      console.warn("[OpenRouteService] Request failed, trying secondary:", orsErr.message);
    }
  }

  // 2. Try Google Maps
  if (config.googleMaps.apiKey) {
    try {
      const stopsParam = stops.length
        ? `&waypoints=${stops.map((s) => `${s.lat},${s.lng}`).join("|")}`
        : "";
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${stopsParam}&key=${config.googleMaps.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.routes[0]?.legs) {
        let totalDistanceMeters = 0;
        let totalDurationSeconds = 0;
        data.routes[0].legs.forEach((leg) => {
          totalDistanceMeters += leg.distance.value;
          totalDurationSeconds += leg.duration.value;
        });

        return {
          distanceKm: Math.round((totalDistanceMeters / 1000) * 10) / 10,
          durationMins: Math.ceil(totalDurationSeconds / 60),
          polyline: data.routes[0].overview_polyline?.points || "",
          provider: "google",
        };
      }
    } catch (err) {
      console.warn("Google Maps API call failed, falling back to local routing:", err.message);
    }
  }

  // Local accurate routing fallback
  let totalDistance = 0;
  let current = origin;
  for (const stop of stops) {
    totalDistance += calculateDistanceKm(current.lat, current.lng, stop.lat, stop.lng);
    current = stop;
  }
  totalDistance += calculateDistanceKm(current.lat, current.lng, destination.lat, destination.lng);

  // Urban traffic curvature and road network factor (typically ~1.25 - 1.35x crow-flies distance)
  const actualRoadDistanceKm = Math.max(1.0, Math.round(totalDistance * 1.3 * 10) / 10);
  // Average urban speed ~25 km/h + 2 mins pickup overhead
  const durationMins = Math.max(3, Math.round((actualRoadDistanceKm / 25) * 60) + 2);

  return {
    distanceKm: actualRoadDistanceKm,
    durationMins,
    polyline: null,
    provider: "local_estimate",
  };
}

/**
 * Server-side fare calculation with transparent price breakdown
 */
export function calculateFare(category, distanceKm, durationMins, promoDiscount = 0) {
  const base = config.pricing.baseFare[category] || config.pricing.baseFare.go;
  const perKm = config.pricing.perKmRate[category] || config.pricing.perKmRate.go;
  const perMin = config.pricing.perMinuteRate[category] || config.pricing.perMinuteRate.go;
  const minFare = config.pricing.minimumFare[category] || config.pricing.minimumFare.go;

  const rawFare = base + distanceKm * perKm + durationMins * perMin;
  const surgeFare = rawFare * config.pricing.surgeMultiplier;
  const totalBeforeDiscount = Math.max(minFare, Math.round(surgeFare));
  const finalFare = Math.max(30, totalBeforeDiscount - promoDiscount);

  return {
    category,
    baseFare: base,
    distanceFare: Math.round(distanceKm * perKm),
    timeFare: Math.round(durationMins * perMin),
    surgeMultiplier: config.pricing.surgeMultiplier,
    minimumFare: minFare,
    grossFare: totalBeforeDiscount,
    discount: promoDiscount,
    finalFare,
    priceRange: `₹${Math.max(minFare, finalFare - 15)}–${finalFare + 20}`,
    currency: "INR",
  };
}
