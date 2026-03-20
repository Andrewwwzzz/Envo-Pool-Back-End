const express = require("express");
const router = express.Router();

const Table = require("../models/table");
const Booking = require("../models/Booking");

/*
MANUAL CONTROL
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
CLEAR MANUAL OVERRIDE
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
DEVICE POLLING (TIME-BASED)
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

    // 🔥 PRIORITY 2: TIME-BASED BOOKING

    // 🇸🇬 Convert NOW to Singapore time
    const now = new Date();
    const sgNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));

    const booking = await Booking.findOne({
      tableId: table._id,
      status: "confirmed",
      paymentStatus: "paid"
    }).sort({ createdAt: -1 });

    if (!booking || !booking.startTime || !booking.endTime) {
      return res.json({ state: "OFF" });
    }

    // 🇸🇬 Convert booking times to SG time
    const startTime = new Date(new Date(booking.startTime).getTime() + (8 * 60 * 60 * 1000));
    const endTime = new Date(new Date(booking.endTime).getTime() + (8 * 60 * 60 * 1000));

    // 🔍 Debug logs
    console.log("SG NOW:", sgNow);
    console.log("START:", startTime);
    console.log("END:", endTime);

    // 🔥 FINAL CHECK
    if (sgNow >= startTime && sgNow <= endTime) {
      return res.json({ state: "ON" });
    }

    return res.json({ state: "OFF" });

  } catch (error) {
    console.log("Device API error:", error);
    res.json({ state: "OFF" });
  }
});

module.exports = router;