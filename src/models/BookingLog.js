const mongoose = require("mongoose");

const bookingLogSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking"
  },

  action: {
    type: String,
    enum: [
      "created",
      "pending_payment",
      "confirmed",
      "expired",
      "cancelled"
    ]
  },

  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  note: String

}, { timestamps: true });

module.exports = mongoose.model("BookingLog", bookingLogSchema);