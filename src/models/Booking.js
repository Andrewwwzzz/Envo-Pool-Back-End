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

  startTime: {
    type: Date,
    required: true
  },

  endTime: {
    type: Date,
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

  stripeSessionId: {
    type: String
  },

  expiresAt: {
    type: Date
  }

}, { timestamps: true })



/*
Database-level protection against double booking
*/
BookingSchema.index(
  { tableId: 1, startTime: 1, endTime: 1 },
  { unique: true }
)



module.exports = mongoose.model("Booking", BookingSchema)