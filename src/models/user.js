const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* Manual DOB Login */
    dateOfBirth: {
      type: String,
      required: false,
      sparse: true
    },
    age: {
      type: Number,
      required: false
    },

    /* Add email or phone later if needed */
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true
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