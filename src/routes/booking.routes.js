const express = require("express");
const router = express.Router();

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const Booking = require("../models/Booking");
const Table = require("../models/table");

/*
CREATE BOOKING + PAYMENT (ATOMIC)
*/
router.post("/create-with-payment", async (req, res) => {
  try {
    const { userId, tableId, startTime, duration } = req.body;

    if (!userId || !tableId || !startTime || !duration) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    // Validate time
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ error: "Invalid time format" });
    }

    const end = new Date(start.getTime() + duration * 60 * 1000);

    // Find table
    const table = await Table.findOne({ hardware_id: tableId });
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    /*
    🔒 HARD LOCK — prevent overlap
    */
    const conflict = await Booking.findOne({
      tableId: table._id,
      status: { $in: ["pending_payment", "confirmed"] },
      $or: [
        { startTime: { $lt: end, $gte: start } },
        { endTime: { $gt: start, $lte: end } },
        { startTime: { $lte: start }, endTime: { $gte: end } }
      ]
    });

    if (conflict) {
      return res.status(409).json({
        error: "Time slot already booked"
      });
    }

    /*
    ⏱️ EXPIRY (5 mins)
    */
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    /*
    💰 PRICE
    */
    const totalPrice = table.basePrice * (duration / 60);

    /*
    🔥 CREATE BOOKING FIRST
    */
    const booking = new Booking({
      userId,
      tableId: table._id,
      startTime: start,
      endTime: end,
      duration,
      status: "pending_payment",
      paymentStatus: "unpaid",
      paymentLock: true,
      expiresAt
    });

    await booking.save();

    /*
    💳 CREATE STRIPE SESSION
    */
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["paynow"],
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "sgd",
            product_data: {
              name: `Pool Booking - ${table.name}`
            },
            unit_amount: Math.round(totalPrice * 100)
          },
          quantity: 1
        }
      ],

      metadata: {
        bookingId: booking._id.toString()
      },

      success_url: process.env.STRIPE_SUCCESSFUL_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL
    });

    /*
    🔗 SAVE SESSION
    */
    booking.stripeSessionId = session.id;
    await booking.save();

    res.json({
      checkoutUrl: session.url,
      bookingId: booking._id
    });

  } catch (error) {
    console.error("Create booking + payment error:", error);

    res.status(500).json({
      error: "Failed to create booking"
    });
  }
});

module.exports = router;