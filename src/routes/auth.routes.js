import express from "express";
import { redirectToSingpass, singpassCallback } from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/singpass", redirectToSingpass);
router.get("/callback", singpassCallback);

export default router;