import { memoryDb, supabase } from "../config/database.js";

let ioInstance = null;

export function initRideSockets(io) {
  ioInstance = io;

  io.use((socket, next) => {
    // Authenticate socket connection via token in handshake auth
    // In production, verify Supabase/Clerk JWT here
    const userId = socket.handshake.auth?.userId;
    const role = socket.handshake.auth?.role || "customer";

    if (!userId) {
      // Anonymous connection is allowed for customer map view only
      socket.user = { id: null, role: "anonymous" };
    } else {
      socket.user = { id: userId, role };
    }
    next();
  });

  io.on("connection", (socket) => {
    // Join personal user room if authenticated
    if (socket.user.id) {
      socket.join(`user:${socket.user.id}`);
    }

    // Join ride room to receive real-time ride events
    socket.on("ride:join", ({ rideId }) => {
      if (rideId && typeof rideId === "string") {
        socket.join(`ride:${rideId}`);
      }
    });

    // Leave ride room
    socket.on("ride:leave", ({ rideId }) => {
      if (rideId && typeof rideId === "string") {
        socket.leave(`ride:${rideId}`);
      }
    });

    // Driver GPS telemetry stream
    // Persists location to DB and broadcasts to any active ride room
    socket.on("driver:location_update", async ({ rideId, latitude, longitude, heading }) => {
      // Validate coords
      if (
        typeof latitude !== "number" || typeof longitude !== "number" ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
      ) {
        return;
      }

      const driverUserId = socket.user.id;

      // 1. Update in-memory driver location
      if (driverUserId) {
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

          // 2. Persist to Supabase driver_locations
          if (supabase) {
            try {
              await supabase.from("driver_locations").upsert(
                {
                  driver_id: driver.id,
                  latitude,
                  longitude,
                  heading: heading ?? 0,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "driver_id" }
              );
            } catch (err) {
              // Non-blocking: log and continue
              console.warn("[Socket GPS persist] Supabase upsert warning:", err.message);
            }
          }
        }
      }

      // 3. Broadcast to any active ride room
      if (rideId && typeof rideId === "string") {
        io.to(`ride:${rideId}`).emit("driver:location_updated", {
          rideId,
          latitude,
          longitude,
          heading: heading ?? 0,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on("disconnect", () => {
      // Room departure is handled automatically by Socket.IO
    });
  });
}

/**
 * Emit event to all sockets in a specific ride room
 */
export function emitRideEvent(rideId, eventName, payload) {
  if (ioInstance) {
    ioInstance.to(`ride:${rideId}`).emit(eventName, payload);
  }
}

/**
 * Emit event to a specific driver's personal room
 */
export function emitToDriver(driverId, eventName, payload) {
  if (ioInstance) {
    ioInstance.to(`driver:${driverId}`).emit(eventName, payload);
  }
}

/**
 * Emit notification to a specific user's personal room
 */
export function emitToUser(userId, eventName, payload) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(eventName, payload);
  }
}
