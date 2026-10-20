import Stripe from "stripe";
import { config } from "../config/env.js";
import { memoryDb } from "../config/database.js";
import { emitRideEvent } from "../sockets/rideSocket.js";

export const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, { apiVersion: "2023-10-16" })
  : null;

export class PaymentService {
  /**
   * Create a Stripe PaymentIntent for a ride
   */
  static async createPaymentIntent({ rideId, user }) {
    const ride = memoryDb.rides.get(rideId);
    if (!ride) {
      const error = new Error("Ride not found");
      error.status = 404;
      throw error;
    }

    if (ride.riderId !== user.id) {
      const error = new Error("Forbidden: You do not own this ride");
      error.status = 403;
      throw error;
    }

    const amountInSmallestUnit = Math.round(ride.finalFare * 100); // In paise for INR, cents for USD
    let clientSecret = "";
    let paymentIntentId = `pi_mock_${Date.now()}`;

    if (stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInSmallestUnit,
          currency: config.stripe.currency,
          metadata: {
            rideId,
            riderId: user.id,
            riderEmail: user.email,
          },
          description: `RideX Trip Payment #${rideId}`,
          automatic_payment_methods: { enabled: true },
        });

        paymentIntentId = paymentIntent.id;
        clientSecret = paymentIntent.client_secret;
      } catch (err) {
        console.warn("Stripe API error:", err.message);
        throw new Error(`Payment gateway error: ${err.message}`);
      }
    } else {
      // Test/development client secret fallback
      clientSecret = `pi_mock_secret_${Date.now()}`;
    }

    const paymentRecord = {
      id: `pay-${Date.now()}`,
      rideId,
      riderId: user.id,
      amount: ride.finalFare,
      currency: config.stripe.currency.toUpperCase(),
      status: "PENDING",
      stripePaymentIntentId: paymentIntentId,
      createdAt: new Date().toISOString(),
    };

    memoryDb.payments.set(paymentRecord.id, paymentRecord);

    return {
      paymentId: paymentRecord.id,
      clientSecret,
      paymentIntentId,
      amount: ride.finalFare,
      currency: config.stripe.currency.toUpperCase(),
    };
  }

  /**
   * Handle Stripe Webhook Events
   */
  static async handleWebhook(event) {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const rideId = paymentIntent.metadata?.rideId;

        // Find and update payment record
        for (const [id, record] of memoryDb.payments.entries()) {
          if (record.stripePaymentIntentId === paymentIntent.id) {
            record.status = "SUCCEEDED";
            record.updatedAt = new Date().toISOString();
            break;
          }
        }

        if (rideId && memoryDb.rides.has(rideId)) {
          const ride = memoryDb.rides.get(rideId);
          ride.paymentStatus = "PAID";
          emitRideEvent(rideId, "payment:succeeded", { rideId, amount: paymentIntent.amount / 100 });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const rideId = paymentIntent.metadata?.rideId;

        for (const [id, record] of memoryDb.payments.entries()) {
          if (record.stripePaymentIntentId === paymentIntent.id) {
            record.status = "FAILED";
            record.errorMessage = paymentIntent.last_payment_error?.message || "Payment failed";
            break;
          }
        }

        if (rideId) {
          emitRideEvent(rideId, "payment:failed", { rideId });
        }
        break;
      }

      default:
        break;
    }

    return { received: true };
  }
}
