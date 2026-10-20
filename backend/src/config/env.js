import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",

  supabase: {
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY || "",
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    currency: (process.env.STRIPE_CURRENCY || "inr").toLowerCase(),
  },

  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  },

  openRouteService: {
    apiKey: process.env.OPENROUTESERVICE_API_KEY || "",
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX || "2000", 10),
  },

  // Ride Pricing Configuration (Nagpur base rates)
  pricing: {
    baseFare: {
      go: 40,
      comfort: 60,
      xl: 90,
      black: 150,
    },
    perKmRate: {
      go: 12,
      comfort: 16,
      xl: 22,
      black: 32,
    },
    perMinuteRate: {
      go: 1.5,
      comfort: 2.0,
      xl: 3.0,
      black: 4.5,
    },
    surgeMultiplier: 1.0,
    minimumFare: {
      go: 80,
      comfort: 120,
      xl: 180,
      black: 250,
    },
  },
};
