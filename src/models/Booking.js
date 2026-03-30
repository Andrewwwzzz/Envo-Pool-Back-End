const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    userName: {
      type: String
    },

    tableId: {
  type: String, // ✅ NOT ObjectId anymore
},

    startTime: Date,
    endTime: Date,
    duration: Number,

    price: Number,

    status: {
      type: String,
      enum: ["pending_payment", "confirmed", "expired"],
      default: "pending_payment"
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid"
    },

    paymentLock: {
      type: Boolean,
      default: false
    },

    stripeSessionId: String,

    expiresAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);