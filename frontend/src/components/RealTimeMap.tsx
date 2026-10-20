"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Minus, Crosshair } from "lucide-react";

interface RealTimeMapProps {
  pickupCoords: [number, number]; // [lat, lng]
  dropoffCoords?: [number, number];
  routeCoords?: [number, number][]; // [[lat, lng], ...]
  drivers?: Array<{
    id: string;
    name: string;
    category: string;
    lat: number;
    lng: number;
    vehiclePlate: string;
    etaMins?: number;
    heading?: number;
  }>;
  mapMode?: "map" | "satellite";
  zoomLevel?: number;
  onSelectMapLocation?: (lat: number, lng: number) => void;
  pickupLabel?: string;
  dropoffLabel?: string;
  interactive?: boolean;
}

export const RealTimeMap: React.FC<RealTimeMapProps> = ({
  pickupCoords,
  dropoffCoords,
  routeCoords = [],
  drivers: initialDrivers = [],
  mapMode = "map",
  onSelectMapLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeGlowLayerRef = useRef<L.Polyline | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Live driver positions with dynamic heading and simulated real-time movement
  const [liveDrivers, setLiveDrivers] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      lat: number;
      lng: number;
      vehiclePlate: string;
      heading: number;
      etaMins?: number;
    }>
  >([]);

  // Sync live drivers from props — use stringified dep to avoid new-reference loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const driversKey = JSON.stringify(initialDrivers ?? []);
  useEffect(() => {
    setLiveDrivers(
      (initialDrivers ?? []).map((d, i) => ({
        ...d,
        heading: d.heading ?? (i * 75 + 30) % 360,
        etaMins: d.etaMins ?? undefined,
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driversKey]);


  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [21.1458, 79.0882], // Dharampeth, Nagpur
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Map click handler to select custom pickup / destination
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onSelectMapLocation) {
        onSelectMapLocation(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onSelectMapLocation]);

  // 2. Tile Layer Switch (Dark Inverted OSM vs Photographic Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (mapMode === "map") {
      // Clean, high-resolution OpenStreetMap Light Theme
      tileLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
        }
      ).addTo(map);
    } else {
      // High-resolution Esri World Satellite
      tileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
        }
      ).addTo(map);
    }
  }, [mapMode]);

  // 3. Render Route & Real-Time Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. Radar pulse & accuracy radius around Rider's real-time position
    L.circle(pickupCoords, {
      radius: 140,
      color: "#0284c7",
      fillColor: "#38bdf8",
      fillOpacity: 0.15,
      weight: 1.5,
      dashArray: "4, 6",
    }).addTo(markersLayer);

    // 2. Custom Rider Location Beacon (Pulsing blue beacon with rider silhouette)
    const riderIcon = L.divIcon({
      className: "custom-rider-beacon",
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 10px rgba(2,132,199,0.5));">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: #0284c7; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: #0284c7; border: 3px solid #ffffff; box-shadow: 0 0 12px #38bdf8; display: flex; align-items: center; justify-content: center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div style="position: absolute; bottom: -8px; background: #0f172a; color: #ffffff; font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 9999px; border: 1px solid #38bdf8; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">YOU</div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    L.marker(pickupCoords, { icon: riderIcon })
      .bindTooltip("<b>You (Rider)</b><br/><span style='color:#38bdf8'>Real-time Pickup Location</span>", {
        direction: "top",
        className: "bg-[#141722] text-white text-xs border border-gray-700 rounded-lg p-1.5 shadow-xl",
      })
      .addTo(markersLayer);

    // 3. Drop-off Destination Pin Icon
    const dropoffIcon = L.divIcon({
      className: "custom-dropoff-pin",
      html: `
        <div style="position: relative; width: 30px; height: 40px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.45));">
          <svg width="30" height="40" viewBox="0 0 24 34" fill="none">
            <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
            <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
          </svg>
        </div>
      `,
      iconSize: [30, 40],
      iconAnchor: [15, 36],
    });

    if (dropoffCoords) {
      L.marker(dropoffCoords, { icon: dropoffIcon })
        .bindTooltip("<b>Drop-off Destination</b>", {
          direction: "top",
          className: "bg-[#141722] text-white text-xs border border-gray-700 rounded-lg p-1.5 shadow-xl",
        })
        .addTo(markersLayer);
    }

    // 4. Add Real-Time Nearby Cabs with Floating ETA Badges
    liveDrivers.forEach((driver) => {
      const carIcon = L.divIcon({
        className: "custom-car-marker",
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="font-size: 8px; font-weight: 800; background: #0f172a; color: #bef264; padding: 1.5px 5px; border-radius: 6px; border: 1px solid #334155; margin-bottom: 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.4); text-transform: uppercase; white-space: nowrap;">
              ${driver.category} • ${driver.etaMins || 3}m
            </div>
            <div style="transform: rotate(${driver.heading}deg); transition: transform 0.6s ease; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.55)); cursor: pointer;">
              <svg width="24" height="38" viewBox="0 0 24 40" fill="none">
                <rect x="3" y="4" width="18" height="32" rx="6" fill="#1e293b" stroke="#0f172a" stroke-width="1.6" />
                <path d="M5 11C5 9.5 6 8 8 8H16C18 8 19 9.5 19 11L18 15H6L5 11Z" fill="#38bdf8" />
                <rect x="6" y="15" width="12" height="12" rx="2" fill="#0f172a" />
                <rect x="9" y="19" width="6" height="4" rx="1" fill="#bef264" />
                <path d="M6 28L6.5 25H17.5L18 28C18 29.5 17 31 15 31H9C7 31 6 29.5 6 28Z" fill="#38bdf8" />
                <rect x="4.5" y="4" width="3.5" height="2" rx="1" fill="#fef08a" />
                <rect x="16" y="4" width="3.5" height="2" rx="1" fill="#fef08a" />
                <rect x="4.5" y="34" width="3" height="1.5" rx="0.7" fill="#ef4444" />
                <rect x="16.5" y="34" width="3" height="1.5" rx="0.7" fill="#ef4444" />
              </svg>
            </div>
          </div>
        `,
        iconSize: [48, 56],
        iconAnchor: [24, 40],
      });

      L.marker([driver.lat, driver.lng], { icon: carIcon })
        .bindTooltip(
          `<b>${driver.name}</b> (${driver.category.toUpperCase()})<br/><span style="color: #bef264;">${driver.etaMins || 3} min away from you</span><br/><small style="color: #94a3b8;">${driver.vehiclePlate}</small>`,
          {
            direction: "top",
            className: "bg-[#141722] text-white text-xs border border-gray-700 rounded-lg p-2 shadow-2xl",
          }
        )
        .addTo(markersLayer);
    });

    // Remove old polylines
    if (routeGlowLayerRef.current) map.removeLayer(routeGlowLayerRef.current);
    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);

    // Draw Real Turn-by-Turn GPS Polyline
    const path: [number, number][] =
      routeCoords.length > 0
        ? routeCoords
        : dropoffCoords
        ? [pickupCoords, dropoffCoords]
        : [pickupCoords];

    const isLightMode = mapMode === "map";
    const underlayColor = isLightMode ? "#1d4ed8" : "#38bdf8";
    const foregroundColor = isLightMode ? "#2563eb" : "#ffffff";
    const underlayOpacity = isLightMode ? 0.35 : 0.5;

    if (path.length > 1) {
      // Route underlay glow
      routeGlowLayerRef.current = L.polyline(path, {
        color: underlayColor,
        weight: 9,
        opacity: underlayOpacity,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Route foreground polyline (signature vibrant navigation blue on light map)
      routeLayerRef.current = L.polyline(path, {
        color: foregroundColor,
        weight: 5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Smoothly fit bounds if coordinates change
      const bounds = L.latLngBounds(path);
      map.fitBounds(bounds, { padding: [70, 70], animate: true });
    } else {
      map.setView(pickupCoords, 14);
    }
  }, [pickupCoords, dropoffCoords, routeCoords, liveDrivers, mapMode]);

  // Zoom and Recenter actions
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      const path: [number, number][] =
        routeCoords.length > 0
          ? routeCoords
          : dropoffCoords
          ? [pickupCoords, dropoffCoords]
          : [pickupCoords];
      if (path.length > 1) {
        mapInstanceRef.current.fitBounds(L.latLngBounds(path), {
          padding: [70, 70],
          animate: true,
        });
      } else {
        mapInstanceRef.current.setView(pickupCoords, 14);
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainerRef}
        className="w-full h-full absolute inset-0 z-0 bg-[#eef2f6]"
      />

      {/* Map Control Buttons: Recenter Crosshair, Zoom In (+), Zoom Out (-) */}
      <div className="absolute right-4 bottom-5 z-20 flex flex-col items-center gap-2">
        <button
          onClick={handleRecenter}
          className="w-9 h-9 rounded-xl bg-[#141722]/90 hover:bg-[#1f2434] text-gray-300 hover:text-white border border-[#232938] flex items-center justify-center shadow-xl backdrop-blur-md transition-all active:scale-95"
          title="Recenter Route"
        >
          <Crosshair size={18} />
        </button>

        <div className="bg-[#141722]/90 backdrop-blur-md border border-[#232938] rounded-xl flex flex-col shadow-xl overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="w-9 h-8.5 hover:bg-[#1f2434] text-gray-300 hover:text-white flex items-center justify-center transition-colors border-b border-[#232938]"
            title="Zoom In"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-9 h-8.5 hover:bg-[#1f2434] text-gray-300 hover:text-white flex items-center justify-center transition-colors"
            title="Zoom Out"
          >
            <Minus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
