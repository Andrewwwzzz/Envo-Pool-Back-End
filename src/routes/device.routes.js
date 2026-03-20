const express = require("express");
const router = express.Router();

const Table = require("../models/table");
const Booking = require("../models/Booking");

/*
MANUAL CONTROL (ADMIN / FRONTEND)
*/
router.post("/control/:hardwareId", async (req, res) => {
  try {
    const { hardwareId } = req.params;
    const { state } = req.body;

    if (!["ON", "OFF"].includes(state)) {
      return res.status(400).json({ error: "Invalid state" });
    }

    const table = await Table.findOne({ hardware_id: hardwareId });

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    table.manualOverride = state;
    await table.save();

    res.json({
      message: `Table ${hardwareId} manually set to ${state}`
    });

  } catch (error) {
    console.log("Manual control error:", error);
    res.status(500).json({ error: "Failed to control device" });
  }
});

/*
CLEAR MANUAL OVERRIDE (return to automatic mode)
*/
router.post("/clear/:hardwareId", async (req, res) => {
  try {
    const { hardwareId } = req.params;

    const table = await Table.findOne({ hardware_id: hardwareId });

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    table.manualOverride = null;
    await table.save();

    res.json({
      message: `Manual override cleared for ${hardwareId}`
    });

  } catch (error) {
    console.log("Clear override error:", error);
    res.status(500).json({ error: "Failed to clear override" });
  }
});

/*
DEVICE POLLING (ESP32)
*/
router.get("/:hardwareId", async (req, res) => {
  try {
    const { hardwareId } = req.params;

    const table = await Table.findOne({ hardware_id: hardwareId });

    if (!table) {
      return res.json({ state: "OFF" });
    }

    // 🔥 PRIORITY 1: Manual override
    if (table.manualOverride === "ON") {
      return res.json({ state: "ON" });
    }

    if (table.manualOverride === "OFF") {
      return res.json({ state: "OFF" });
    }

    // 🔥 PRIORITY 2: Booking (SESSION BASED)
    const now = new Date();

    const booking = await Booking.findOne({
      tableId: table._id,
      status: "confirmed",
      paymentStatus: "paid"
    });

    if (!booking) {
      return res.json({ state: "OFF" });
    }

    // Extract session info
    const parts = booking.sessionId.split("-");
    const dateStr = parts.slice(0, 3).join("-");
    const sessionNumber = parseInt(parts[3]);

    // 🔥 DEFINE YOUR SESSION TIMES HERE
    const sessionMap = {
      1: { start: 10, end: 12 },
      2: { start: 12, end: 14 },
      3: { start: 14, end: 16 },
      4: { start: 16, end: 18 },
      5: { start: 18, end: 20 },
      6: { start: 20, end: 22 }
    };

    const sessionTime = sessionMap[sessionNumber];

    if (!sessionTime) {
      return res.json({ state: "OFF" });
    }

    // Build actual times
    const startTime = new Date(dateStr);
    startTime.setHours(sessionTime.start, 0, 0);

    const endTime = new Date(dateStr);
    endTime.setHours(sessionTime.end, 0, 0);

    // 🔥 FINAL CHECK
    if (now >= startTime && now <= endTime) {
      return res.json({ state: "ON" });
    }

    return res.json({ state: "OFF" });

  } catch (error) {
    console.log("Device API error:", error);
    res.json({ state: "OFF" });
  }
});

module.exports = router;