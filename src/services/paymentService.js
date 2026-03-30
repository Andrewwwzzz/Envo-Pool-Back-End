const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const User = require("../models/user");
const Transaction = require("../models/Transaction");
const BookingLog = require("../models/BookingLog");
const AdminLog = require("../models/AdminLog");

exports.confirmBookingPayment = async ({
  bookingId,
  paymentMethod,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) throw new Error("Booking not found");

    // 🧠 Prevent double execution
    if (booking.status === "confirmed") {
      await session.commitTransaction();
      return booking;
    }

    const user = await User.findById(booking.userId).session(session);
    if (!user) throw new Error("User not found");

    // 💰 CALCULATE POINTS (1 point = 1 cent)
    const pointsEarned = Math.round(booking.amount * 100);

    // ✅ Update booking
    booking.status = "confirmed";
    booking.paymentMethod = paymentMethod;
    booking.paidAt = new Date();

    await booking.save({ session });

    // 💰 Transaction (payment)
    await Transaction.create([{
      userId: user._id,
      bookingId: booking._id,
      amount: booking.amount,
      type: "payment",
      method: paymentMethod,
      status: "success"
    }], { session });

    // 📊 Update user stats
    user.totalSpent += booking.amount;
    user.points = (user.points || 0) + pointsEarned;

    await user.save({ session });

    // 🧾 Booking log
    await BookingLog.create([{
      bookingId: booking._id,
      action: "confirmed",
      performedBy: user._id
    }], { session });

    // 🧾 Admin log (reward points)
    await AdminLog.create([{
      adminId: user._id,
      action: "reward_points",
      targetUserId: user._id,
      details: {
        bookingId: booking._id,
        pointsEarned
      }
    }], { session });

    await session.commitTransaction();

    // ⚡ SOCKET EVENTS
    const io = require("../socket").io;

    io.emit("bookingUpdated", {
      bookingId: booking._id,
      status: "confirmed"
    });

    io.emit("walletUpdated", {
      userId: user._id,
      walletBalance: user.walletBalance,
      points: user.points
    });

    io.emit("pointsUpdated", {
      userId: user._id,
      points: user.points,
      earned: pointsEarned
    });

    return booking;

  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

exports.payWithWallet = async ({ bookingId }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) throw new Error("Booking not found");

    if (booking.status !== "pending_payment") {
      throw new Error("Invalid booking state");
    }

    const user = await User.findById(booking.userId).session(session);

    if (user.walletBalance < booking.amount) {
      throw new Error("Insufficient balance");
    }

    // 💸 Deduct wallet
    user.walletBalance -= booking.amount;
    await user.save({ session });

    await session.commitTransaction();

    // 🔥 reuse same logic
    return await exports.confirmBookingPayment({
      bookingId,
      paymentMethod: "wallet"
    });

  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};