const express = require("express");
const router = express.Router();

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const Booking = require("../models/Booking");

/*
🚨 IMPORTANT:
We NO LONGER allow creating payments separately.
All payments must come from:
POST /api/bookings/create-with-payment

So this route is REMOVED to prevent bugs:
❌ /create-checkout
*/

/*
STRIPE WEBHOOK
*/
router.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    /*
    ✅ PAYMENT SUCCESS
    */
    if (event.type === "checkout.session.completed") {

      const session = event.data.object;
      const bookingId = session.metadata.bookingId;

      if (!bookingId) {
        console.log("No bookingId in metadata");
        return res.json({ received: true });
      }

      const booking = await Booking.findById(bookingId);

      if (!booking) {
        console.log("Booking not found:", bookingId);
        return res.json({ received: true });
      }

      /*
      🔁 Already processed safeguard
      */
      if (booking.paymentStatus === "paid") {
        return res.json({ received: true });
      }

      /*
      ⏱️ EXPIRED BOOKING → reject payment
      */
      if (booking.expiresAt < new Date()) {

        await Booking.updateOne(
          { _id: bookingId },
          {
            status: "expired",
            paymentLock: false
          }
        );

        console.log("Payment received but booking expired:", bookingId);

        return res.json({ received: true });
      }

      /*
      ✅ CONFIRM BOOKING
      */
      await Booking.updateOne(
        { _id: bookingId },
        {
          status: "confirmed",
          paymentStatus: "paid",
          paymentLock: false
        }
      );

      console.log("Booking confirmed:", bookingId);
    }

    /*
    ❌ PAYMENT FAILED / CANCELLED (optional handling)
    */
    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const bookingId = session.metadata.bookingId;

      if (bookingId) {
        await Booking.updateOne(
          { _id: bookingId },
          {
            status: "expired",
            paymentLock: false
          }
        );

        console.log("Booking expired via Stripe:", bookingId);
      }
    }

    res.json({ received: true });

  } catch (err) {
    console.log("Webhook error:", err);
    res.json({ received: true });
  }
});

module.exports = router;