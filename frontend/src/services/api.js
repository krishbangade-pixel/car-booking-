/**
 * RideX API Client
 * Connects Next.js Frontend with the RideX Backend Services
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

class RideXApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  setAuthToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    } else {
      // Demo session fallback for local dev
      headers["x-demo-user-id"] = "user_krish_bangade";
      headers["x-demo-role"] = "rider";
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (err) {
      console.warn(`[RideX API] Request to ${endpoint} failed:`, err.message);
      throw err;
    }
  }

  // Health Check
  getHealth() {
    return this.request("/health");
  }

  // Fare Estimates
  getEstimates(pickup, dropoff, stops = [], promoCode = null) {
    return this.request("/rides/estimate", {
      method: "POST",
      body: JSON.stringify({
        pickup,
        dropoff,
        stops,
        promoCode,
      }),
    });
  }

  // Create / Request Ride
  createRide({ pickup, dropoff, rideCategory, paymentMethod = "card", promoCode = null }) {
    return this.request("/rides", {
      method: "POST",
      body: JSON.stringify({
        pickup,
        dropoff,
        rideCategory,
        paymentMethod,
        promoCode,
      }),
    });
  }

  // Get User Profile
  getProfile() {
    return this.request("/profile");
  }

  // Get Saved Places
  getSavedPlaces() {
    return this.request("/profile/saved-places");
  }

  // Get User Rides
  getRides() {
    return this.request("/rides");
  }

  // Cancel Ride
  cancelRide(rideId, reason = "Changed plans") {
    return this.request(`/rides/${rideId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  // Validate Promo Code
  validatePromo(code, fareAmount) {
    return this.request("/promos/validate", {
      method: "POST",
      body: JSON.stringify({ code, fareAmount }),
    });
  }

  // Create Stripe Payment Intent
  createPaymentIntent(rideId) {
    return this.request("/payments/create-intent", {
      method: "POST",
      body: JSON.stringify({ rideId }),
    });
  }
}

export const api = new RideXApiClient();
