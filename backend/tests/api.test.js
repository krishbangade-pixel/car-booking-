import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { calculateDistanceKm, calculateFare } from "../src/services/mapsService.js";

test("API Health Endpoint", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.service, "RideX Cab Booking API");
});

test("Maps Service: Haversine distance calculation", () => {
  // Dharampeth (21.1458, 79.0882) to Sitabuldi (21.152, 79.085)
  const dist = calculateDistanceKm(21.1458, 79.0882, 21.152, 79.085);
  assert.ok(dist >= 0.5 && dist <= 2.0, `Expected distance between 0.5 and 2.0 km, got ${dist}`);
});

test("Maps Service: Fare calculation algorithm", () => {
  const fareGo = calculateFare("go", 5.4, 12);
  assert.equal(fareGo.category, "go");
  assert.ok(fareGo.finalFare >= 100 && fareGo.finalFare <= 180);

  const fareComfort = calculateFare("comfort", 5.4, 12);
  assert.ok(fareComfort.finalFare > fareGo.finalFare, "Comfort should be more expensive than Go");

  const fareXL = calculateFare("xl", 5.4, 12);
  assert.ok(fareXL.finalFare > fareComfort.finalFare, "XL should be more expensive than Comfort");
});

test("POST /api/rides/estimate with validation", async () => {
  const payload = {
    pickup: { address: "Dharampeth, Nagpur", lat: 21.1458, lng: 79.0882 },
    dropoff: { address: "Suryodaya College, Nagpur", lat: 21.1611, lng: 79.1412 },
  };

  const res = await request(app).post("/api/rides/estimate").send(payload);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.estimates.length === 4);
  assert.equal(res.body.data.estimates[0].category, "go");
});

test("POST /api/rides/estimate rejects invalid coordinates", async () => {
  const invalidPayload = {
    pickup: { address: "Dharampeth, Nagpur", lat: 199.0, lng: 79.0882 }, // lat > 90
    dropoff: { address: "Suryodaya College, Nagpur", lat: 21.1611, lng: 79.1412 },
  };

  const res = await request(app).post("/api/rides/estimate").send(invalidPayload);
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "ValidationError");
});

test("POST /api/rides creates a ride and assigns nearby driver", async () => {
  const ridePayload = {
    pickup: { address: "Dharampeth, Nagpur", lat: 21.1458, lng: 79.0882 },
    dropoff: { address: "Suryodaya College, Nagpur", lat: 21.1611, lng: 79.1412 },
    rideCategory: "go",
    paymentMethod: "card",
  };

  const res = await request(app)
    .post("/api/rides")
    .set("Authorization", "Bearer mock_token")
    .set("x-demo-user-id", "test_rider_1")
    .send(ridePayload);

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.id);
  assert.equal(res.body.data.status, "ACCEPTED");
  assert.ok(res.body.data.driver);
  assert.equal(res.body.data.otp.length, 4);
});

test("POST /api/promos/validate validates promo code", async () => {
  const res = await request(app).post("/api/promos/validate").send({
    code: "NAGPUR50",
    fareAmount: 180,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.discount, 50);
  assert.equal(res.body.data.newFare, 130);
});

test("RBAC Security: Rider cannot access driver endpoints", async () => {
  const res = await request(app)
    .get("/api/driver/requests")
    .set("Authorization", "Bearer mock_token")
    .set("x-demo-user-id", "test_rider_1")
    .set("x-demo-role", "rider");

  assert.equal(res.status, 403);
  assert.equal(res.body.error, "Forbidden");
});
