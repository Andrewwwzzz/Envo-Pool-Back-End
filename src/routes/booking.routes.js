const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const Booking = require("../models/Booking");
const Table = require("../models/table");
const Transaction = require("../models/Transaction");
const BookingLog = require("../models/BookingLog");

const auth = require("../middleware/auth");

/*
========================================
VALIDATION
========================================
*/
async function validateBooking({ tableId, startTime, duration }) {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60000);

  const table = await Table.findOne({ hardware_id: tableId });
  if (!table) throw new Error("Table not found");

  const conflict = await Booking.findOne({
    tableId: tableId, // ✅ hardware_id ONLY
    status: { $in: ["pending_payment", "confirmed"] },
    startTime: { $lt: end },
    endTime: { $gt: start }
  });

  if (conflict) throw new Error("Time slot already booked");

  return { start, end };
}

/*
========================================
PAYNOW / STRIPE BOOKING (PENDING)
========================================
*/
router.post("/create-with-payment", auth, async (req, res) => {
  try {
    const io = req.app.get("io");

    const user = req.user;

    if (!user.isVerified) {
      return res.status(403).json({ error: "Account not verified" });
    }

    const { tableId, startTime, duration, price } = req.body;

    const { start, end } =
      await validateBooking({ tableId, startTime, duration });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // create pending booking
    const booking = new Booking({
      userId: user._id,
      userName: user.name,
      tableId: tableId, // ✅ hardware_id
      startTime: start,
      endTime: end,
      duration,
      price,
      status: "pending_payment",
      paymentStatus: "unpaid",
      paymentMethod: "paynow",
      expiresAt
    });

    await booking.save();

    // booking log
    await BookingLog.create({
      bookingId: booking._id,
      action: "pending_payment",
      performedBy: user._id
    });

    // stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["paynow"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "sgd",
            product_data: {
              name: `Pool Booking ${tableId}`
            },
            unit_amount: Math.round(price * 100)
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

    booking.stripeSessionId = session.id;
    await booking.save();

    io.emit("booking_updated");

    res.json({
      checkoutUrl: session.url
    });

  } catch (error) {
    console.error("PAYNOW ERROR:", error);
    res.status(400).json({ error: error.message });
  }
});

/*
========================================
WALLET BOOKING (CONFIRMED)
========================================
*/
router.post("/create-with-wallet", auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const io = req.app.get("io");

    const user = req.user;

    if (!user.isVerified) {
      throw new Error("Account not verified");
    }

    const { tableId, startTime, duration, price } = req.body;

    const { start, end } =
      await validateBooking({ tableId, startTime, duration });

    if (user.walletBalance < price) {
      throw new Error("Insufficient wallet balance");
    }

    // deduct wallet
    user.walletBalance -= price;
    await user.save({ session });

    // create booking
    const booking = await Booking.create([{
      userId: user._id,
      userName: user.name,
      tableId: tableId,
      startTime: start,
      endTime: end,
      duration,
      price,
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "wallet"
    }], { session });

    // transaction log
    await Transaction.create([{
      userId: user._id,
      type: "wallet_deduct",
      amount: -price,
      balanceAfter: user.walletBalance,
      reference: booking[0]._id,
      performedBy: user._id,
      note: "Booking via wallet"
    }], { session });

    // booking log
    await BookingLog.create([{
      bookingId: booking[0]._id,
      action: "confirmed",
      performedBy: user._id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // realtime updates
    io.emit("booking_updated");
    io.emit("wallet_updated", { userId: user._id });
    io.emit("transaction_updated");

    res.json({
      message: "Booking confirmed"
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("WALLET ERROR:", error);

    res.status(400).json({ error: error.message });
  }
});

/*
========================================
GET BOOKINGS (FOR UI)
========================================
*/
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().lean();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

module.exports = router;