const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true
    },

    walletBalance: {
      type: Number,
      default: 0
    },

    showName: {
      type: Boolean,
      default: true
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    verificationMethod: {
      type: String,
      enum: ["admin", "singpass", null],
      default: null
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);