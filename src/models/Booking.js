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
    enum: ["pending_payment", "confirmed", "cancelled"],
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

  expiresAt: {
    type: Date,
    required: true
  }

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


/*
TTL Index
Deletes booking automatically after expiresAt
*/
BookingSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
)

module.exports = mongoose.model("Booking", BookingSchema)