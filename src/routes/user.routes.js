const express = require("express");
const router = express.Router();

const User = require("../models/user");
const auth = require("../middleware/auth");

/*
GET ALL USERS (ADMIN ONLY)
*/
router.get("/", auth, async (req, res) => {
  try {
    // 🔴 only allow admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Admin access only"
      });
    }

    const users = await User.find().select("-password");

    res.json(users);

  } catch (error) {
    console.error("GET USERS ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch users"
    });
  }
});

module.exports = router;