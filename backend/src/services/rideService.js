import { randomUUID } from "node:crypto";
import { memoryDb, supabase, isSupabaseConfigured } from "../config/database.js";
import { getRouteDetails, calculateFare, calculateDistanceKm } from "./mapsService.js";
import { emitRideEvent, emitToDriver } from "../sockets/rideSocket.js";

export class RideService {
  /**
   * Calculate fare estimates for all ride categories
   */
  static async getEstimates({ pickup, dropoff, stops = [], promoCode }) {
    const route = await getRouteDetails(pickup, dropoff, stops);

    let promoDiscount = 0;
    if (promoCode) {
      const promo = memoryDb.promoCodes.get(promoCode.toUpperCase());
      if (promo && promo.is_active) {
        promoDiscount = promo.discount_value;
      }
    }

    const categories = ["go", "comfort", "xl", "black"];
    const estimates = categories.map((cat) => {
      const fare = calculateFare(cat, route.distanceKm, route.durationMins, promoDiscount);
      return {
        ...fare,
        etaMinutes: cat === "go" ? 3 : cat === "comfort" ? 5 : cat === "xl" ? 6 : 7,
      };
    });

    return {
      route: {
        distanceKm: route.distanceKm,
        durationMins: route.durationMins,
        coordinates: route.coordinates || [],
        bbox: route.bbox || null,
        polyline: route.polyline || null,
        provider: route.provider,
      },
      estimates,
    };
  }

  /**
   * Create and request a new ride
   */
  static async createRide({ user, pickup, dropoff, stops = [], rideCategory, paymentMethod, promoCode }) {
    const route = await getRouteDetails(pickup, dropoff, stops);

    let promoDiscount = 0;
    if (promoCode) {
      const promo = memoryDb.promoCodes.get(promoCode.toUpperCase());
      if (promo && promo.is_active) {
        promoDiscount = promo.discount_value;
      }
    }

    const fareInfo = calculateFare(rideCategory, route.distanceKm, route.durationMins, promoDiscount);
    const rideId = randomUUID();
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP for ride start

    // Check if user.id is valid UUID, otherwise generate deterministic fallback UUID
    const validRiderId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
      ? user.id
      : "00000000-0000-0000-0000-000000000001";

    const rideData = {
      id: rideId,
      riderId: validRiderId,
      riderName: user.fullName,
      riderEmail: user.email,
      pickupAddress: pickup.address,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffAddress: dropoff.address,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      stops,
      rideCategory,
      distanceKm: route.distanceKm,
      durationMins: route.durationMins,
      fareEstimate: fareInfo.finalFare,
      finalFare: fareInfo.finalFare,
      currency: "INR",
      paymentMethod,
      status: "REQUESTED",
      otp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("rides").insert([
          {
            id: rideId,
            rider_id: validRiderId,
            pickup_address: pickup.address,
            pickup_lat: pickup.lat,
            pickup_lng: pickup.lng,
            dropoff_address: dropoff.address,
            dropoff_lat: dropoff.lat,
            dropoff_lng: dropoff.lng,
            stops,
            ride_category: rideCategory,
            distance_km: route.distanceKm,
            duration_mins: route.durationMins,
            fare_estimate: fareInfo.finalFare,
            final_fare: fareInfo.finalFare,
            status: "REQUESTED",
            otp,
          },
        ]);
        if (error) {
          console.warn(`[Supabase Ride Sync] Non-blocking warning: ${error.message}`);
        }
      } catch (err) {
        console.warn(`[Supabase Ride Sync] Non-blocking: ${err.message}`);
      }
    }

    // Save to memory DB
    memoryDb.rides.set(rideId, rideData);

    // Find and match eligible available drivers nearby
    const matchedDriver = await this.matchDriver(pickup, rideCategory);
    if (matchedDriver) {
      // Auto-assign or dispatch request event
      rideData.driverId = matchedDriver.id;
      rideData.driver = {
        id: matchedDriver.id,
        name: matchedDriver.name,
        phone: matchedDriver.phone,
        vehicleMake: matchedDriver.vehicleMake,
        vehicleModel: matchedDriver.vehicleModel,
        vehiclePlate: matchedDriver.vehiclePlate,
        vehicleColor: matchedDriver.vehicleColor,
        rating: matchedDriver.rating,
      };
      rideData.status = "ACCEPTED";
      rideData.acceptedAt = new Date().toISOString();

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from("rides")
            .update({
              driver_id: matchedDriver.id,
              status: "ACCEPTED",
              accepted_at: rideData.acceptedAt,
            })
            .eq("id", rideId);
        } catch (sbErr) {
          console.warn(`[Supabase Driver Assign Sync] ${sbErr.message}`);
        }
      }

      emitToDriver(matchedDriver.id, "ride:requested", rideData);
      emitRideEvent(rideId, "ride:accepted", rideData);
    }

    return rideData;
  }

  /**
   * Driver Matching Algorithm
   * Checks Supabase for real online available drivers first.
   * Returns null if no real driver is available so ride stays REQUESTED.
   */
  static async matchDriver(pickup, rideCategory) {
    const driverProfiles = Array.from(memoryDb.driverProfiles.values()).filter((profile) => {
      const matchesCategory = !rideCategory || profile.rideCategory === rideCategory || profile.rideCategory === "go";
      return profile.isAvailable && profile.approvalStatus === "approved" && matchesCategory;
    });

    if (driverProfiles.length > 0) {
      let best = null;
      let bestDist = Infinity;

      for (const driver of driverProfiles) {
        const dist = calculateDistanceKm(pickup.lat, pickup.lng, driver.lat, driver.lng);
        if (dist < bestDist) {
          bestDist = dist;
          best = {
            id: driver.id,
            userId: driver.userId,
            name: driver.name,
            phone: driver.phone,
            vehicleMake: driver.vehicleMake,
            vehicleModel: driver.vehicleModel,
            vehiclePlate: driver.vehiclePlate,
            vehicleColor: driver.vehicleColor,
            rating: driver.rating,
            lat: driver.lat,
            lng: driver.lng,
          };
        }
      }

      if (best) {
        return best;
      }
    }

    // Try Supabase first — only match REAL verified online drivers
    if (isSupabaseConfigured) {
      try {
        const { data: profiles } = await supabase
          .from("driver_profiles")
          .select("id, user_id, vehicle_make, vehicle_model, vehicle_plate, vehicle_color, rating, ride_category")
          .eq("approval_status", "approved")
          .eq("is_available", true);

        if (profiles && profiles.length > 0) {
          // Get locations for these drivers
          const driverIds = profiles.map((p) => p.id);
          const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min

          const { data: locations } = await supabase
            .from("driver_locations")
            .select("driver_id, latitude, longitude")
            .in("driver_id", driverIds)
            .gte("updated_at", staleThreshold);

          if (locations && locations.length > 0) {
            // Find closest driver to pickup
            let best = null;
            let bestDist = Infinity;
            for (const loc of locations) {
              const dist = calculateDistanceKm(pickup.lat, pickup.lng, loc.latitude, loc.longitude);
              if (dist < bestDist) {
                bestDist = dist;
                const prof = profiles.find((p) => p.id === loc.driver_id);
                if (prof) {
                  best = {
                    id: prof.id,
                    userId: prof.user_id,
                    name: "Driver",
                    phone: "",
                    vehicleMake: prof.vehicle_make,
                    vehicleModel: prof.vehicle_model,
                    vehiclePlate: prof.vehicle_plate,
                    vehicleColor: prof.vehicle_color,
                    rating: prof.rating,
                    lat: loc.latitude,
                    lng: loc.longitude,
                  };
                }
              }
            }
            if (best) return best;
          }
        }
      } catch (err) {
        console.warn("[matchDriver] Supabase lookup error:", err.message);
      }
    }

    // No real or fallback driver available — leave ride requested.
    return null;
  }

  /**
   * Get single ride details with ownership authorization check
   */
  static async getRideById(rideId, user) {
    const ride = memoryDb.rides.get(rideId);
    if (!ride) return null;

    // Authorization check: User must be rider, assigned driver, or admin
    if (user.role !== "admin" && ride.riderId !== user.id && ride.driverId !== user.id) {
      const error = new Error("Access denied: You do not own this ride record");
      error.status = 403;
      throw error;
    }

    return ride;
  }

  /**
   * Cancel Ride
   */
  static async cancelRide(rideId, user, reason) {
    const ride = memoryDb.rides.get(rideId);
    if (!ride) return null;

    if (user.role !== "admin" && ride.riderId !== user.id && ride.driverId !== user.id) {
      const error = new Error("Forbidden: Not authorized to cancel this ride");
      error.status = 403;
      throw error;
    }

    if (["COMPLETED", "CANCELLED"].includes(ride.status)) {
      const error = new Error(`Cannot cancel ride with current status: ${ride.status}`);
      error.status = 400;
      throw error;
    }

    ride.status = "CANCELLED";
    ride.cancellationReason = reason;
    ride.cancelledBy = user.id;
    ride.cancelledAt = new Date().toISOString();
    ride.updatedAt = new Date().toISOString();

    // Release driver availability
    if (ride.driverId && memoryDb.driverProfiles.has(ride.driverId)) {
      const driver = memoryDb.driverProfiles.get(ride.driverId);
      driver.isAvailable = true;
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from("rides")
          .update({
            status: "CANCELLED",
            cancellation_reason: reason,
            cancelled_at: ride.cancelledAt,
            updated_at: ride.updatedAt,
          })
          .eq("id", rideId);
      } catch (sbErr) {
        console.warn(`[Supabase Cancel Sync] ${sbErr.message}`);
      }
    }

    emitRideEvent(rideId, "ride:cancelled", { rideId, reason, cancelledBy: user.id });
    return ride;
  }

  /**
   * Update ride status (Driver workflow: ACCEPTED -> ARRIVING -> IN_PROGRESS -> COMPLETED)
   */
  static async updateRideStatus(rideId, user, { status, otp }) {
    // First try Supabase for the ride record
    let ride = memoryDb.rides.get(rideId);

    // If not in memory (e.g. ride was created while server was down), try Supabase
    if (!ride && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from("rides").select("*").eq("id", rideId).maybeSingle();
        if (data) {
          // Reconstruct in-memory ride object from Supabase record
          ride = {
            id: data.id,
            riderId: data.rider_id,
            driverId: data.driver_id,
            pickupAddress: data.pickup_address,
            dropoffAddress: data.dropoff_address,
            finalFare: data.final_fare || data.fare_estimate,
            status: data.status,
            otp: data.otp,
          };
          memoryDb.rides.set(rideId, ride);
        }
      } catch (err) {
        console.warn("[updateRideStatus] Supabase ride lookup:", err.message);
      }
    }

    if (!ride) {
      const error = new Error("Ride not found");
      error.status = 404;
      throw error;
    }

    // ACCEPTING: Any online rider can accept a REQUESTED ride
    if (status === "ACCEPTED") {
      if (ride.status !== "REQUESTED") {
        const error = new Error(`Ride is already ${ride.status} — cannot accept`);
        error.status = 400;
        throw error;
      }
      ride.driverId = user.id;
      ride.status = "ACCEPTED";
      ride.acceptedAt = new Date().toISOString();
      ride.updatedAt = ride.acceptedAt;

      if (isSupabaseConfigured) {
        try {
          // Get driver_profile id for this user
          const { data: driverProf } = await supabase
            .from("driver_profiles")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          await supabase.from("rides").update({
            driver_id: driverProf?.id || user.id,
            status: "ACCEPTED",
            accepted_at: ride.acceptedAt,
            updated_at: ride.updatedAt,
          }).eq("id", rideId);
        } catch (sbErr) {
          console.warn(`[Supabase Accept Sync] ${sbErr.message}`);
        }
      }

      emitRideEvent(rideId, "ride:accepted", ride);
      return ride;
    }

    // For other status transitions: ensure driver is assigned driver or admin
    if (user.role !== "admin" && ride.driverId !== user.id) {
      const error = new Error("Forbidden: Only the assigned driver can update ride status");
      error.status = 403;
      throw error;
    }

    // Verify OTP when transitioning to IN_PROGRESS
    if (status === "IN_PROGRESS") {
      if (!otp || otp !== ride.otp) {
        const error = new Error("Invalid start OTP. Ask the passenger for their OTP.");
        error.status = 400;
        throw error;
      }
      ride.startedAt = new Date().toISOString();
    }

    if (status === "ARRIVING") {
      ride.arrivedAt = new Date().toISOString();
    }

    if (status === "COMPLETED") {
      ride.completedAt = new Date().toISOString();
      // Free driver up
      if (ride.driverId && memoryDb.driverProfiles.has(ride.driverId)) {
        const driver = memoryDb.driverProfiles.get(ride.driverId);
        driver.isAvailable = true;
        driver.totalRides += 1;
      }
      // Also update Supabase driver_profiles availability
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from("driver_profiles")
            .update({ is_available: true })
            .eq("user_id", user.id);
        } catch {}
      }
    }

    ride.status = status;
    ride.updatedAt = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        const updatePayload = { status, updated_at: ride.updatedAt };
        if (status === "ARRIVING") updatePayload.arrived_at = ride.arrivedAt;
        if (status === "IN_PROGRESS") updatePayload.started_at = ride.startedAt;
        if (status === "COMPLETED") updatePayload.completed_at = ride.completedAt;
        await supabase.from("rides").update(updatePayload).eq("id", rideId);
      } catch (sbErr) {
        console.warn(`[Supabase Status Sync] ${sbErr.message}`);
      }
    }

    emitRideEvent(rideId, "ride:status_updated", ride);
    return ride;
  }

  /**
   * Submit ride review
   */
  static async submitReview(rideId, user, { rating, reviewText }) {
    const ride = memoryDb.rides.get(rideId);
    if (!ride) return null;

    if (ride.riderId !== user.id) {
      const error = new Error("Forbidden: Only the rider can submit a review");
      error.status = 403;
      throw error;
    }

    if (ride.status !== "COMPLETED") {
      const error = new Error("Can only review completed rides");
      error.status = 400;
      throw error;
    }

    const reviewId = `rev-${Date.now()}`;
    const review = {
      id: reviewId,
      rideId,
      riderId: user.id,
      driverId: ride.driverId,
      rating,
      reviewText,
      createdAt: new Date().toISOString(),
    };

    memoryDb.rideReviews.set(reviewId, review);

    // Recalculate driver average rating
    if (ride.driverId && memoryDb.driverProfiles.has(ride.driverId)) {
      const driver = memoryDb.driverProfiles.get(ride.driverId);
      const allDriverReviews = Array.from(memoryDb.rideReviews.values()).filter(
        (r) => r.driverId === ride.driverId
      );
      const sum = allDriverReviews.reduce((acc, r) => acc + r.rating, 0);
      driver.rating = Math.round((sum / allDriverReviews.length) * 100) / 100;
    }

    return review;
  }
}
