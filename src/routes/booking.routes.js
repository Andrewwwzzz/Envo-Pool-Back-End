const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const Booking = require("../models/Booking");
const Table = require("../models/table");
const User = require("../models/user");

/*
========================================
COMMON VALIDATION
========================================
*/
async function validateBooking({ userId, tableId, startTime, duration }) {

  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    throw new Error("Invalid time format");
  }

  const end = new Date(start.getTime() + duration * 60 * 1000);

  const table = await Table.findOne({ hardware_id: tableId });
  if (!table) throw new Error("Table not found");

  /*
  ❌ Prevent overlapping bookings (pending + confirmed)
  */
  const conflict = await Booking.findOne({
    tableId: table._id,
    status: { $in: ["pending_payment", "confirmed"] },
    startTime: { $lt: end },
    endTime: { $gt: start }
  });

  if (conflict) throw new Error("Time slot already booked");

  /*
  🚫 Prevent spam (1 pending booking per user)
  */
  const existingPending = await Booking.findOne({
    userId,
    status: "pending_payment"
  });

  if (existingPending) {
    throw new Error("You already have a pending booking");
  }

  return { table, start, end };
}

/*
========================================
STRIPE FLOW
========================================
*/
router.post("/create-with-payment", async (req, res) => {
  try {
    const { userId, tableId, startTime, duration, price } = req.body;

    if (!price || price <= 0) {
      return res.status(400).json({ error: "Invalid price" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { table, start, end } =
      await validateBooking({ userId, tableId, startTime, duration });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const booking = new Booking({
      userId,
      userName: user.name,
      tableId: table._id,
      startTime: start,
      endTime: end,
      duration,
      price,
      status: "pending_payment",
      paymentStatus: "unpaid",
      paymentLock: true,
      expiresAt
    });

    await booking.save();

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

    res.json({
      checkoutUrl: session.url,
      bookingId: booking._id
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/*
========================================
WALLET FLOW
========================================
*/
router.post("/create-with-wallet", async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, tableId, startTime, duration, price } = req.body;

    if (!price || price <= 0) {
      throw new Error("Invalid price");
    }

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    const { table, start, end } =
      await validateBooking({ userId, tableId, startTime, duration });

    if (user.walletBalance < price) {
      throw new Error("Insufficient wallet balance");
    }

    user.walletBalance -= price;
    await user.save({ session });

    const booking = await Booking.create([{
      userId,
      userName: user.name,
      tableId: table._id,
      startTime: start,
      endTime: end,
      duration,
      price,
      status: "confirmed",
      paymentStatus: "paid",
      paymentLock: false
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: "Booking confirmed via wallet",
      bookingId: booking[0]._id
    });

  } catch (error) {

    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      error: error.message
    });
  }
});

/*
========================================
TOGGLE NAME VISIBILITY
========================================
*/
router.post("/toggle-name-visibility", async (req, res) => {
  try {
    const { userId, showName } = req.body;

    await User.updateOne(
      { _id: userId },
      { showName }
    );

    res.json({ message: "Updated successfully" });

  } catch (error) {
    res.status(500).json({ error: "Failed to update setting" });
  }
});

/*
========================================
GET BOOKINGS
========================================
*/
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("tableId")
      .sort({ startTime: 1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch bookings"
    });
  }
});

/*
========================================
AVAILABILITY (WITH NAME + COUNTDOWN)
========================================
*/
router.get("/availability", async (req, res) => {
  try {

    const { startTime, endTime } = req.query;

    const start = new Date(startTime);
    const end = new Date(endTime);

    const bookings = await Booking.find({
      status: { $in: ["pending_payment", "confirmed"] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    }).populate("tableId userId");

    const result = bookings.map(b => ({
      tableId: b.tableId.hardware_id,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      expiresAt: b.expiresAt,
      userName: b.userId?.showName ? b.userName : "Anonymous"
    }));

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch availability"
    });
  }
});

module.exports = router;