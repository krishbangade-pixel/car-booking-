import { createClient } from "@supabase/supabase-js";
import { config } from "./env.js";

// Database client abstraction with memory store fallback for standalone local development & test suite
class MemoryDatabase {
  constructor() {
    this.profiles = new Map();
    this.driverProfiles = new Map();
    this.driverLocations = new Map();
    this.rides = new Map();
    this.payments = new Map();
    this.rideReviews = new Map();
    this.savedPlaces = new Map();
    this.promoCodes = new Map([
      [
        "NAGPUR50",
        {
          id: "promo-1",
          code: "NAGPUR50",
          discount_type: "flat",
          discount_value: 50,
          min_order_value: 120,
          is_active: true,
          valid_until: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
      ],
      [
        "RIDEX20",
        {
          id: "promo-2",
          code: "RIDEX20",
          discount_type: "percentage",
          discount_value: 20,
          max_discount: 100,
          min_order_value: 150,
          is_active: true,
          valid_until: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
      ],
    ]);
    this.supportTickets = new Map();
    this.notifications = new Map();

    // Seed mock verified drivers around Nagpur
    this.seedMockDrivers();
  }

  seedMockDrivers() {
    // Verified drivers mapped directly from Supabase driver_profiles table
    const drivers = [
      {
        id: "a1111111-1111-1111-1111-111111111111",
        userId: "11111111-1111-1111-1111-111111111111",
        name: "Rajesh Sharma",
        phone: "+91 98765 00001",
        licenseNumber: "MH31-2019-001234",
        vehicleMake: "Hyundai",
        vehicleModel: "Verna",
        vehicleColor: "White",
        vehiclePlate: "MH 31 AB 4022",
        rideCategory: "go",
        approvalStatus: "approved",
        isAvailable: true,
        rating: 4.9,
        totalRides: 0,
        lat: 21.1458,
        lng: 79.0882,
      },
      {
        id: "a2222222-2222-2222-2222-222222222222",
        userId: "22222222-2222-2222-2222-222222222222",
        name: "Amit Deshmukh",
        phone: "+91 98765 00002",
        licenseNumber: "MH31-2020-005678",
        vehicleMake: "Honda",
        vehicleModel: "City",
        vehicleColor: "Silver",
        vehiclePlate: "MH 31 CD 8899",
        rideCategory: "comfort",
        approvalStatus: "approved",
        isAvailable: true,
        rating: 4.85,
        totalRides: 0,
        lat: 21.1498,
        lng: 79.0806,
      },
      {
        id: "a3333333-3333-3333-3333-333333333333",
        userId: "33333333-3333-3333-3333-333333333333",
        name: "Sunil Patil",
        phone: "+91 98765 00003",
        licenseNumber: "MH31-2018-009988",
        vehicleMake: "Toyota",
        vehicleModel: "Innova Crysta",
        vehicleColor: "Black",
        vehiclePlate: "MH 31 EF 1010",
        rideCategory: "xl",
        approvalStatus: "approved",
        isAvailable: true,
        rating: 4.95,
        totalRides: 0,
        lat: 21.152,
        lng: 79.085,
      },
      {
        id: "a4444444-4444-4444-4444-444444444444",
        userId: "44444444-4444-4444-4444-444444444444",
        name: "Vikram Singhania",
        phone: "+91 98765 00004",
        licenseNumber: "MH31-2021-003322",
        vehicleMake: "BMW",
        vehicleModel: "3 Series",
        vehicleColor: "Black",
        vehiclePlate: "MH 31 VIP 0007",
        rideCategory: "black",
        approvalStatus: "approved",
        isAvailable: true,
        rating: 5.0,
        totalRides: 0,
        lat: 21.139,
        lng: 79.075,
      },
    ];

    drivers.forEach((d) => {
      this.driverProfiles.set(d.id, d);
      this.driverLocations.set(d.id, {
        driverId: d.id,
        latitude: d.lat,
        longitude: d.lng,
        heading: 45,
        updatedAt: new Date().toISOString(),
      });
    });
  }
}

export const memoryDb = new MemoryDatabase();

// Supabase client instance (used when SUPABASE_URL & keys are provided)
export const supabase =
  config.supabase.url && config.supabase.serviceRoleKey
    ? createClient(config.supabase.url, config.supabase.serviceRoleKey, {
        auth: { persistSession: false },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);
