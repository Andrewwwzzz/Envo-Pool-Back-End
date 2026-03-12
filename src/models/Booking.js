const mongoose = require("mongoose")

const BookingSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  sessionId: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["pending_payment", "confirmed", "expired", "cancelled"],
    default: "pending_payment"
  },

  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid"],
    default: "unpaid"
  },

  stripeSessionId: String,

  expiresAt: Date

}, { timestamps: true })



/*
Lock booking by table + session
*/
BookingSchema.index(
  { tableId: 1, sessionId: 1 },
  { unique: true }
)

module.exports = mongoose.model("Booking", BookingSchema)