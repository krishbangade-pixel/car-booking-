import { z } from "zod";

// Geographic Coordinates schema
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Fare estimate request validation
export const fareEstimateSchema = {
  body: z.object({
    pickup: z.object({
      address: z.string().min(2),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    dropoff: z.object({
      address: z.string().min(2),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    stops: z
      .array(
        z.object({
          address: z.string().min(2),
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        })
      )
      .optional()
      .default([]),
    promoCode: z.string().optional(),
  }),
};

// Create Ride request validation
export const createRideSchema = {
  body: z.object({
    pickup: z.object({
      address: z.string().min(2),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    dropoff: z.object({
      address: z.string().min(2),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    stops: z
      .array(
        z.object({
          address: z.string().min(2),
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        })
      )
      .optional()
      .default([]),
    rideCategory: z.enum(["go", "comfort", "xl", "black"]),
    paymentMethod: z.enum(["card", "upi", "cash"]).default("card"),
    promoCode: z.string().optional(),
  }),
};

// Cancel Ride schema
export const cancelRideSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    reason: z.string().min(3).max(500).optional().default("Changed plans"),
  }),
};

// Review Ride schema
export const reviewRideSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    rating: z.number().int().min(1).max(5),
    reviewText: z.string().max(1000).optional(),
  }),
};

// Saved Place schema
export const savedPlaceSchema = {
  body: z.object({
    label: z.string().min(1).max(64),
    address: z.string().min(3),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
};

// Driver Availability schema
export const driverAvailabilitySchema = {
  body: z.object({
    isAvailable: z.boolean(),
  }),
};

// Driver Location Update schema
export const driverLocationSchema = {
  body: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    heading: z.number().min(0).max(360).optional().default(0),
  }),
};

// Driver Status Update schema
export const driverStatusUpdateSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(["ACCEPTED", "ARRIVING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    otp: z.string().length(4).optional(),
  }),
};

// Payment Intent schema
export const createPaymentIntentSchema = {
  body: z.object({
    rideId: z.string().min(1),
  }),
};

// Promo code validate schema
export const validatePromoSchema = {
  body: z.object({
    code: z.string().min(2).max(32),
    fareAmount: z.number().positive(),
  }),
};

// Support ticket schema
export const supportTicketSchema = {
  body: z.object({
    rideId: z.string().optional(),
    category: z.string().min(2).max(64),
    description: z.string().min(10).max(2000),
  }),
};
