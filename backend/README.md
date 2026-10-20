# RideX Cab Booking Platform — Backend Documentation

RideX is a production-grade, secure, modular cab-booking backend built with Node.js, Express, Socket.IO, Supabase PostgreSQL, Clerk Authentication, and Stripe.

---

## 1. Architecture & Tech Stack
- **Runtime**: Node.js (ES Modules)
- **Web Framework**: Express.js with Helmet, CORS, and Express-Rate-Limit
- **Real-Time Telemetry**: Socket.IO for live driver location updates and ride events
- **Database & RLS**: Supabase PostgreSQL with Row Level Security (RLS) migrations
- **Identity & Auth**: Clerk Authentication with RBAC (`rider`, `driver`, `admin`)
- **Payment Processing**: Stripe PaymentIntents & Webhook handling
- **Routing & Maps**: Google Maps Directions/Distance Matrix with accurate urban routing fallback
- **Validation**: Zod schema validation on request bodies, params, and queries

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── app.js                   # Express application setup, middlewares, rate limiters
│   ├── server.js                # HTTP & Socket.IO server entrypoint
│   ├── config/
│   │   ├── env.js               # Typed configuration and environment parsing
│   │   └── database.js          # Supabase client & in-memory dev database
│   ├── middleware/
│   │   ├── auth.js              # Clerk authentication & RBAC middleware
│   │   └── validate.js          # Zod validation middleware
│   ├── routes/
│   │   └── api.js               # Modular API route definitions
│   ├── controllers/
│   │   └── apiControllers.js    # Request handlers for rides, drivers, payments
│   ├── services/
│   │   ├── mapsService.js       # Haversine distance, routes, and fare calculations
│   │   ├── rideService.js       # Ride lifecycle, driver matching & cancellation
│   │   └── paymentService.js    # Stripe PaymentIntents & Webhook processing
│   ├── validators/
│   │   └── rideValidators.js    # Zod schemas for coordinates, rides, reviews
│   └── sockets/
│       └── rideSocket.js        # Socket.IO rooms, events, driver telemetry
├── supabase/
│   └── migrations/
│       └── 20261012000000_init_ridex_schema.sql # Complete PostgreSQL DDL with RLS
├── tests/
│   └── api.test.js              # Automated Node.js native test suite
├── .env.example                 # Environment variable templates
└── package.json                 # Dependencies and execution scripts
```

---

## 3. Database Schema & Supabase Migrations
The migration file in `backend/supabase/migrations/20261012000000_init_ridex_schema.sql` establishes 10 core tables with Row Level Security (RLS):

1. **`profiles`**: Clerk user synchronization, email, full name, phone, role (`rider`, `driver`, `admin`).
2. **`driver_profiles`**: License number, vehicle make/model/color/plate, ride category (`go`, `comfort`, `xl`, `black`), approval status, availability, rating.
3. **`driver_locations`**: Driver telemetry coordinates (latitude, longitude, heading, timestamp).
4. **`rides`**: Pickup/drop-off addresses, coordinates, stops JSONB, fare estimates, status lifecycle (`REQUESTED` → `ACCEPTED` → `ARRIVING` → `IN_PROGRESS` → `COMPLETED`), OTP, and cancellation metadata.
5. **`payments`**: Ride reference, Stripe PaymentIntent ID, amount in INR, payment status.
6. **`ride_reviews`**: Rating (1–5 stars) and review text linked to rides and drivers.
7. **`saved_places`**: Home, Work, and favorite addresses with coordinates per user.
8. **`promo_codes`**: Flat and percentage discount rules with expiration and usage limits.
9. **`support_tickets`**: Emergency and customer support ticketing system.
10. **`notifications`**: User alerts and promo notices.

---

## 4. API Endpoints

### Health & Profile
- `GET /api/health`: Health status and service uptime.
- `GET /api/profile`: Authenticated user profile.
- `PATCH /api/profile`: Update user contact info.
- `GET /api/profile/saved-places`: Fetch saved places (Home, Work, etc.).
- `POST /api/profile/saved-places`: Create a saved place.
- `DELETE /api/profile/saved-places/:id`: Remove a saved place.

### Rides
- `POST /api/rides/estimate`: Calculate fares for Go, Comfort, XL, and Black across Nagpur.
- `POST /api/rides`: Request a ride, compute server-side fare, and match nearest driver.
- `GET /api/rides`: List authenticated user's rides.
- `GET /api/rides/:id`: Get ride details by ID (enforces ownership check).
- `POST /api/rides/:id/cancel`: Cancel an active ride.
- `POST /api/rides/:id/review`: Submit a 1–5 star driver review for completed trips.

### Driver Operations (RBAC Protected: `driver`, `admin`)
- `GET /api/driver/requests`: Pending ride requests awaiting driver pickup.
- `PATCH /api/driver/availability`: Toggle online/offline status.
- `PUT /api/driver/location`: Broadcast driver GPS coordinates.
- `PATCH /api/driver/rides/:id/status`: Transition ride status with OTP verification.
- `GET /api/driver/earnings`: Summary of driver daily and weekly earnings.

### Payments
- `POST /api/payments/create-intent`: Create a Stripe PaymentIntent for the ride.
- `POST /api/webhooks/stripe`: Handle Stripe webhook callbacks (`payment_intent.succeeded`, etc.).

### Promos & Support
- `POST /api/promos/validate`: Verify and apply promo codes (e.g. `NAGPUR50`).
- `GET /api/notifications`: Retrieve user notifications.
- `POST /api/support/tickets`: File a 24/7 support or safety ticket.

---

## 5. Local Setup & Testing

### Running the Backend
```bash
cd backend
npm install
npm run dev
```

### Running Backend Tests
```bash
npm test
```
The test suite validates:
- Health checks
- Haversine routing and fare calculations
- Schema validation and boundary rejections
- Driver matching and OTP generation
- Promo code calculations
- Role-based access control (RBAC) isolation
