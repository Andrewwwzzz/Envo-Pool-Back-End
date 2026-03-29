const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  action: String, // "delete_user", "update_wallet"

  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  details: Object

}, { timestamps: true });

module.exports = mongoose.model("AdminLog", adminLogSchema);