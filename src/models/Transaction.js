const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  type: {
    type: String,
    enum: ["wallet_topup", "wallet_deduct", "admin_adjustment"],
    required: true
  },

  amount: { type: Number, required: true },

  balanceAfter: { type: Number },

  reference: {
    type: String // e.g. bookingId / stripeSessionId
  },

  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  note: String

}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);