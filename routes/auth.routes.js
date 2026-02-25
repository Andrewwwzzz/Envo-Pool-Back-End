const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");

// Step 1: Redirect to Singpass (Triggers PAR)
router.get("/singpass", authController.redirectToSingpass);

// Step 2: Callback from Singpass after login
router.get("/callback", authController.singpassCallback);

module.exports = router;