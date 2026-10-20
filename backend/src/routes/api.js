import express from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as validators from "../validators/rideValidators.js";
import * as controllers from "../controllers/apiControllers.js";

const router = express.Router();

// ====================================================================
// HEALTH CHECK
// ====================================================================
router.get("/health", controllers.getHealth);

// ====================================================================
// PROFILE & SAVED PLACES
// ====================================================================
router.get("/profile", authenticate, controllers.getProfile);
router.patch("/profile", authenticate, controllers.updateProfile);
router.get("/profile/saved-places", authenticate, controllers.getSavedPlaces);
router.post(
  "/profile/saved-places",
  authenticate,
  validate(validators.savedPlaceSchema),
  controllers.createSavedPlace
);
router.delete("/profile/saved-places/:id", authenticate, controllers.deleteSavedPlace);

// ====================================================================
// RIDER BOOKING ROUTES
// ====================================================================
router.post(
  "/rides/estimate",
  validate(validators.fareEstimateSchema),
  controllers.getFareEstimates
);
router.get("/drivers/nearby", async (req, res) => {
  const centerLat = parseFloat(req.query.lat) || 21.1458;
  const centerLng = parseFloat(req.query.lng) || 79.0882;
  const MAX_RADIUS_KM = 8; // Only show drivers within 8 km

  // Haversine distance in km
  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  try {
    if (controllers.supabase) {
      const { data, error } = await controllers.supabase
        .from("driver_profiles")
        .select(`
          id,
          ride_category,
          vehicle_make,
          vehicle_model,
          vehicle_plate,
          rating,
          profiles:user_id (full_name),
          driver_locations (latitude, longitude, heading, updated_at)
        `)
        .eq("is_available", true)
        .eq("approval_status", "approved");

      if (!error && data) {
        const STALE_MINUTES = 10; // Ignore location updates older than 10 min
        const now = Date.now();

        const drivers = data
          .filter((d) => {
            // Must have a real broadcasted GPS location
            const loc = Array.isArray(d.driver_locations)
              ? d.driver_locations[0]
              : d.driver_locations;
            if (!loc?.latitude || !loc?.longitude) return false;

            // Must not be stale
            if (loc.updated_at) {
              const ageMs = now - new Date(loc.updated_at).getTime();
              if (ageMs > STALE_MINUTES * 60 * 1000) return false;
            }

            // Must be within radius
            const distKm = haversineKm(centerLat, centerLng, Number(loc.latitude), Number(loc.longitude));
            return distKm <= MAX_RADIUS_KM;
          })
          .map((d) => {
            const loc = Array.isArray(d.driver_locations)
              ? d.driver_locations[0]
              : d.driver_locations;
            const lat = Number(loc.latitude);
            const lng = Number(loc.longitude);
            const distKm = haversineKm(centerLat, centerLng, lat, lng);
            // Rough ETA: assume 25 km/h average speed in city
            const etaMins = Math.max(1, Math.round((distKm / 25) * 60));

            const driverName =
              d.profiles && typeof d.profiles === "object" && "full_name" in d.profiles
                ? d.profiles.full_name
                : "Verified Driver";

            return {
              id: d.id,
              name: driverName || "Driver",
              category: d.ride_category || "go",
              lat,
              lng,
              heading: loc.heading || 0,
              etaMins,
              distanceKm: Math.round(distKm * 10) / 10,
              vehicleMake: d.vehicle_make,
              vehicleModel: d.vehicle_model,
              vehiclePlate: d.vehicle_plate,
              rating: Number(d.rating) || 4.9,
            };
          })
          // Sort nearest first
          .sort((a, b) => a.distanceKm - b.distanceKm);

        if (drivers.length > 0) {
          return res.json({ success: true, data: drivers, source: "supabase" });
        }
      }
    }
  } catch (err) {
    console.warn("Supabase driver fetch error:", err.message);
  }

  const liveDrivers = Array.from(controllers.memoryDb.driverProfiles.values())
    .filter((driver) => driver.isAvailable && driver.approvalStatus === "approved")
    .map((driver, index) => {
      const driftLat = Math.sin((Date.now() / 1000 + index * 17) / 60) * 0.004;
      const driftLng = Math.cos((Date.now() / 1000 + index * 13) / 60) * 0.005;
      const lat = Number((driver.lat + driftLat).toFixed(5));
      const lng = Number((driver.lng + driftLng).toFixed(5));
      const distKm = haversineKm(centerLat, centerLng, lat, lng);

      if (distKm > MAX_RADIUS_KM) {
        return null;
      }

      return {
        id: driver.id,
        name: driver.name,
        category: driver.rideCategory || "go",
        lat,
        lng,
        heading: ((driver.lng - centerLng) * 120 + index * 37) % 360,
        etaMins: Math.max(1, Math.round((distKm / 25) * 60)),
        distanceKm: Number(distKm.toFixed(1)),
        vehicleMake: driver.vehicleMake,
        vehicleModel: driver.vehicleModel,
        vehiclePlate: driver.vehiclePlate,
        rating: Number(driver.rating) || 4.9,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return res.json({
    success: true,
    data: liveDrivers,
    source: liveDrivers.length > 0 ? "local_live" : "none",
  });
});
router.post(
  "/rides",
  authenticate,
  validate(validators.createRideSchema),
  controllers.requestRide
);
router.get("/rides", authenticate, controllers.getUserRides);
router.get("/rides/:id", authenticate, controllers.getRideById);
router.post(
  "/rides/:id/cancel",
  authenticate,
  validate(validators.cancelRideSchema),
  controllers.cancelRide
);
router.post(
  "/rides/:id/review",
  authenticate,
  validate(validators.reviewRideSchema),
  controllers.reviewRide
);

// ====================================================================
// DRIVER & RIDER ROUTES
// ====================================================================
router.get("/driver/requests", authenticate, requireRole("driver", "admin"), controllers.getDriverRequests);
router.patch(
  "/driver/availability",
  authenticate,
  requireRole("driver", "admin"),
  validate(validators.driverAvailabilitySchema),
  controllers.updateDriverAvailability
);
router.put(
  "/driver/location",
  authenticate,
  requireRole("driver", "admin"),
  validate(validators.driverLocationSchema),
  controllers.updateDriverLocation
);
router.patch(
  "/driver/rides/:id/status",
  authenticate,
  requireRole("driver", "admin"),
  validate(validators.driverStatusUpdateSchema),
  controllers.updateDriverRideStatus
);
router.get("/driver/earnings", authenticate, requireRole("driver", "admin"), controllers.getDriverEarnings);

// ====================================================================
// PAYMENT ROUTES
// ====================================================================
router.post(
  "/payments/create-intent",
  authenticate,
  validate(validators.createPaymentIntentSchema),
  controllers.createPaymentIntent
);
router.post("/webhooks/stripe", controllers.handleStripeWebhook);

// ====================================================================
// PROMOTIONS, NOTIFICATIONS & SUPPORT
// ====================================================================
router.post("/promos/validate", validate(validators.validatePromoSchema), controllers.validatePromo);
router.get("/notifications", authenticate, controllers.getNotifications);
router.post(
  "/support/tickets",
  authenticate,
  validate(validators.supportTicketSchema),
  controllers.createSupportTicket
);

export default router;
