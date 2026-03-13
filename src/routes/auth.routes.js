import express from "express";
import authController from "../controllers/auth.controller.js";

const router = express.Router();

// start singpass login
router.get("/singpass", authController.redirectToSingpass);

// callback
router.get("/callback", authController.singpassCallback);

export default router;
