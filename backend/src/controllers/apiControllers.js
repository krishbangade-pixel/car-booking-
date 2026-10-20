import { memoryDb, supabase } from "../config/database.js";
import { RideService } from "../services/rideService.js";
import { PaymentService } from "../services/paymentService.js";

export { memoryDb, supabase };

// ====================================================================
// HEALTH & PROFILE CONTROLLERS
// ====================================================================
export const getHealth = (req, res) => {
  res.json({
    status: "ok",
    service: "RideX Cab Booking API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
};

export const getProfile = (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      clerkId: req.user.clerkId,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role,
      avatarUrl: "/images/avatar_krish.png",
      phone: "+91 98765 43210",
      rating: 4.9,
      totalRides: 42,
    },
  });
};

export const updateProfile = (req, res) => {
  const { fullName, phone } = req.body;
  if (fullName) req.user.fullName = fullName;
  if (phone) req.user.phone = phone;

  res.json({
    success: true,
    data: req.user,
  });
};

export const getSavedPlaces = async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("saved_places")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return res.json({ success: true, data, source: "supabase" });
      }
    }
  } catch (err) {
    console.warn("Supabase saved_places error:", err.message);
  }

  const userPlaces = Array.from(memoryDb.savedPlaces.values()).filter(
    (p) => p.userId === req.user.id
  );

  const defaultPlaces = [
    { id: "sp-1", label: "Home", address: "Ramdaspeth, Nagpur", latitude: 21.1415, longitude: 79.0768 },
    { id: "sp-2", label: "Work", address: "MIHAN SEZ, Nagpur", latitude: 21.0664, longitude: 79.0569 },
    { id: "sp-3", label: "College", address: "Suryodaya College, Nagpur", latitude: 21.1611, longitude: 79.1412 },
  ];

  res.json({
    success: true,
    data: userPlaces.length > 0 ? userPlaces : defaultPlaces,
  });
};

export const createSavedPlace = async (req, res) => {
  const placeId = `sp-${Date.now()}`;
  const newPlace = {
    id: placeId,
    userId: req.user.id,
    ...req.body,
    createdAt: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from("saved_places").insert([
        {
          name: req.body.label || "Saved Place",
          address: req.body.address,
          latitude: req.body.latitude || 21.1458,
          longitude: req.body.longitude || 79.0882,
        },
      ]);
    } catch (e) {
      console.warn("Supabase saved place insert warning:", e.message);
    }
  }

  memoryDb.savedPlaces.set(placeId, newPlace);
  res.status(201).json({ success: true, data: newPlace });
};

export const deleteSavedPlace = (req, res) => {
  const { id } = req.params;
  memoryDb.savedPlaces.delete(id);
  res.json({ success: true, message: "Saved place deleted successfully" });
};

// ====================================================================
// RIDE BOOKING CONTROLLERS
// ====================================================================
export const getFareEstimates = async (req, res, next) => {
  try {
    const estimates = await RideService.getEstimates(req.body);
    res.json({ success: true, data: estimates });
  } catch (err) {
    next(err);
  }
};

export const requestRide = async (req, res, next) => {
  try {
    const ride = await RideService.createRide({
      user: req.user,
      ...req.body,
    });
    res.status(201).json({ success: true, data: ride });
  } catch (err) {
    next(err);
  }
};

export const getUserRides = async (req, res) => {
  const userId = req.user.id;
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("rider_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        const formatted = data.map((r) => ({
          id: r.id,
          rideCategory: r.ride_category,
          pickupAddress: r.pickup_address,
          dropoffAddress: r.dropoff_address,
          distanceKm: r.distance_km,
          durationMins: r.duration_mins,
          finalFare: r.final_fare || r.fare_estimate,
          status: r.status,
          otp: r.otp,
          createdAt: r.created_at,
        }));
        return res.json({ success: true, data: formatted, source: "supabase" });
      }
    }
  } catch (err) {
    console.warn("Supabase user rides error:", err.message);
  }

  const userRides = Array.from(memoryDb.rides.values())
    .filter((r) => r.riderId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, data: userRides });
};

export const getRideById = async (req, res, next) => {
  try {
    const ride = await RideService.getRideById(req.params.id, req.user);
    if (!ride) {
      return res.status(404).json({ success: false, error: "Ride not found" });
    }
    res.json({ success: true, data: ride });
  } catch (err) {
    next(err);
  }
};

export const cancelRide = async (req, res, next) => {
  try {
    const cancelledRide = await RideService.cancelRide(req.params.id, req.user, req.body.reason);
    res.json({ success: true, data: cancelledRide });
  } catch (err) {
    next(err);
  }
};

export const reviewRide = async (req, res, next) => {
  try {
    const review = await RideService.submitReview(req.params.id, req.user, req.body);
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
};

// ====================================================================
// DRIVER CONTROLLERS
// ====================================================================
export const getDriverRequests = async (req, res) => {
  try {
    if (supabase) {
      const { data: dbRequests } = await supabase
        .from("rides")
        .select(`
          id,
          pickup_address,
          pickup_lat,
          pickup_lng,
          dropoff_address,
          dropoff_lat,
          dropoff_lng,
          fare_estimate,
          final_fare,
          distance_km,
          duration_mins,
          created_at,
          status,
          profiles:rider_id (full_name)
        `)
        .eq("status", "REQUESTED")
        .order("created_at", { ascending: false });

      if (dbRequests && dbRequests.length > 0) {
        const formatted = dbRequests.map((r) => {
          const riderName = (r.profiles && typeof r.profiles === "object" && "full_name" in r.profiles)
            ? r.profiles.full_name
            : "Passenger";
          return {
            id: r.id,
            customerName: riderName,
            customerPhone: "",
            customerRating: 4.8,
            pickup: r.pickup_address,
            dropoff: r.dropoff_address,
            fare: Number(r.final_fare || r.fare_estimate) || 200,
            distanceKm: Number(r.distance_km) || 5,
            durationMins: Number(r.duration_mins) || 10,
            pickupCoords: [Number(r.pickup_lat), Number(r.pickup_lng)],
            dropoffCoords: [Number(r.dropoff_lat), Number(r.dropoff_lng)],
            otp: r.otp || "",
            status: r.status,
            createdAt: r.created_at,
          };
        });
        return res.json({ success: true, data: formatted });
      }
    }
  } catch (err) {
    console.warn("Supabase pending requests fetch error:", err.message);
  }

  const pendingRides = Array.from(memoryDb.rides.values())
    .filter((r) => r.status === "REQUESTED")
    .map((r) => ({
      id: r.id,
      customerName: r.riderName || "Passenger",
      customerPhone: "+91 98234 11099",
      customerRating: 4.9,
      pickup: r.pickupAddress,
      dropoff: r.dropoffAddress,
      fare: r.finalFare || r.fareEstimate,
      distanceKm: r.distanceKm,
      durationMins: r.durationMins,
      pickupCoords: [r.pickupLat, r.pickupLng],
      dropoffCoords: [r.dropoffLat, r.dropoffLng],
      status: r.status,
      createdAt: r.createdAt,
    }));

  res.json({ success: true, data: pendingRides });
};

export const updateDriverAvailability = async (req, res) => {
  const { isAvailable } = req.body;
  const userId = req.user.id;

  // Update memory store
  const driver = Array.from(memoryDb.driverProfiles.values()).find(
    (d) => d.userId === userId
  );
  if (driver) {
    driver.isAvailable = isAvailable;
  }

  // Update Supabase
  if (supabase) {
    try {
      await supabase
        .from("driver_profiles")
        .update({ is_available: isAvailable })
        .eq("user_id", userId);
    } catch (err) {
      console.warn("[updateDriverAvailability] Supabase warning:", err.message);
    }
  }

  res.json({ success: true, isAvailable });
};

export const updateDriverLocation = async (req, res) => {
  const { latitude, longitude, heading } = req.body;
  const driverUserId = req.user.id;

  // 1. Update memory store (used by matchDriver and nearby query fallback)
  const driver = Array.from(memoryDb.driverProfiles.values()).find(
    (d) => d.userId === driverUserId
  );
  if (driver) {
    driver.lat = latitude;
    driver.lng = longitude;
    memoryDb.driverLocations.set(driver.id, {
      driverId: driver.id,
      latitude,
      longitude,
      heading: heading ?? 0,
      updatedAt: new Date().toISOString(),
    });
  }

  // 2. Upsert to Supabase driver_locations (enables real-time customer nearby view)
  if (supabase) {
    try {
      const { data: driverProf } = await supabase
        .from("driver_profiles")
        .select("id")
        .eq("user_id", driverUserId)
        .maybeSingle();

      if (driverProf?.id) {
        await supabase.from("driver_locations").upsert(
          {
            driver_id: driverProf.id,
            latitude,
            longitude,
            heading: heading ?? 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "driver_id" }
        );
      }
    } catch (err) {
      console.warn("[updateDriverLocation] Supabase upsert warning:", err.message);
    }
  }

  res.json({ success: true, location: { latitude, longitude, heading: heading ?? 0 } });
};

export const updateDriverRideStatus = async (req, res, next) => {
  try {
    const updated = await RideService.updateRideStatus(req.params.id, req.user, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const getDriverEarnings = async (req, res) => {
  const driverUserId = req.user?.id;
  let totalEarnings = 0;
  let todayEarnings = 0;
  let totalRides = 0;

  try {
    if (supabase) {
      // Find driver profile
      const { data: driverProf } = await supabase
        .from("driver_profiles")
        .select("id")
        .eq("user_id", driverUserId)
        .maybeSingle();

      const driverId = driverProf?.id;
      if (driverId) {
        const { data: completedRides } = await supabase
          .from("rides")
          .select("final_fare, created_at, status")
          .eq("driver_id", driverId)
          .eq("status", "COMPLETED");

        if (completedRides && completedRides.length > 0) {
          totalRides = completedRides.length;
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          completedRides.forEach((r) => {
            const fare = Number(r.final_fare) || 0;
            totalEarnings += fare;
            if (new Date(r.created_at) >= todayStart) {
              todayEarnings += fare;
            }
          });

          return res.json({
            success: true,
            data: {
              today: todayEarnings,
              thisWeek: totalEarnings,
              totalRides,
              currency: "INR",
            },
          });
        }
      }
    }
  } catch (err) {
    console.warn("Driver earnings calculation error:", err.message);
  }

  // Memory store calculation
  const completedMemoryRides = Array.from(memoryDb.rides.values()).filter(
    (r) => (r.driverId === driverUserId || r.driver?.id === driverUserId) && r.status === "COMPLETED"
  );
  completedMemoryRides.forEach((r) => {
    totalEarnings += Number(r.finalFare) || 0;
    todayEarnings += Number(r.finalFare) || 0;
  });

  res.json({
    success: true,
    data: {
      today: todayEarnings,
      thisWeek: totalEarnings,
      totalRides: completedMemoryRides.length,
      currency: "INR",
    },
  });
};

// ====================================================================
// PAYMENTS CONTROLLERS
// ====================================================================
export const createPaymentIntent = async (req, res, next) => {
  try {
    const payment = await PaymentService.createPaymentIntent({
      rideId: req.body.rideId,
      user: req.user,
    });
    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

export const handleStripeWebhook = async (req, res, next) => {
  try {
    const result = await PaymentService.handleWebhook(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ====================================================================
// PROMOS, NOTIFICATIONS & SUPPORT
// ====================================================================
export const validatePromo = (req, res) => {
  const { code, fareAmount } = req.body;
  const promo = memoryDb.promoCodes.get(code.toUpperCase());

  if (!promo || !promo.is_active) {
    return res.status(400).json({ success: false, error: "Invalid or expired promo code" });
  }

  let discount = promo.discount_type === "flat" ? promo.discount_value : (fareAmount * promo.discount_value) / 100;
  if (promo.max_discount) discount = Math.min(discount, promo.max_discount);

  res.json({
    success: true,
    data: {
      code: promo.code,
      discount: Math.round(discount),
      newFare: Math.max(30, Math.round(fareAmount - discount)),
    },
  });
};

export const getNotifications = (req, res) => {
  const list = [
    {
      id: "notif-1",
      title: "Flat ₹50 OFF RideX Comfort",
      message: "Use promo code NAGPUR50 on your next ride across Nagpur.",
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "notif-2",
      title: "Nagpur Metro Hub Drop-offs Active",
      message: "Direct drop-off at Sitabuldi interchange is now operational.",
      isRead: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
  res.json({ success: true, data: list });
};

export const createSupportTicket = (req, res) => {
  const ticketId = `ticket-${Date.now()}`;
  const newTicket = {
    id: ticketId,
    userId: req.user.id,
    ...req.body,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };

  memoryDb.supportTickets.set(ticketId, newTicket);
  res.status(201).json({ success: true, data: newTicket });
};
