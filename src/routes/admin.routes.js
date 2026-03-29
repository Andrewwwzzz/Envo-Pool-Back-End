const express = require("express");
const router = express.Router();

const User = require("../models/user");
const auth = require("../middleware/auth");

/*
🔒 ADMIN MIDDLEWARE
Only allow admin users
*/
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin access only"
    });
  }
  next();
}

/*
GET ALL UNVERIFIED USERS
*/
router.get("/unverified-users", auth, requireAdmin, async (req, res) => {
  try {

    const users = await User.find({ isVerified: false })
      .select("-password"); // hide password

    res.json(users);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/*
VERIFY USER
*/
router.post("/verify-user", auth, requireAdmin, async (req, res) => {
  try {

    const { userId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isVerified: true,
        verificationMethod: "admin"
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    res.json({
      message: "User verified successfully",
      user
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to verify user" });
  }
});

module.exports = router;