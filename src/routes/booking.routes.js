const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");

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
    tableId: tableId, // ✅ hardware_id only
    status: { $in: ["pending_payment", "confirmed"] },
    startTime: { $lt: end },
    endTime: { $gt: start }
  });

  if (conflict) throw new Error("Time slot already booked");

  return { start, end };
}

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
      tableId: tableId, // ✅ hardware_id
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

    // realtime
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
GET BOOKINGS
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