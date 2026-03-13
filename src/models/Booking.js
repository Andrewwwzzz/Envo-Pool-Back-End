const mongoose = require("mongoose")

const BookingSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Table"
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

  paymentLock: {
    type: Boolean,
    default: false
  },

  stripeSessionId: String,

  expiresAt: Date

}, { timestamps: true })


/*
Unique booking per table per session
Only applies to active bookings
*/
BookingSchema.index(
  { tableId: 1, sessionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending_payment", "confirmed"] }
    }
  }
)

module.exports = mongoose.model("Booking", BookingSchema)