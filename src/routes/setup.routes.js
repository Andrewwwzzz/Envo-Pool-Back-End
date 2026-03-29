const express = require("express");
const router = express.Router();
const Table = require("../models/table");

// Seed tables route
router.post("/seed-tables", async (req, res) => {
  try {
    await Table.deleteMany({});

    const tables = [];

    for (let i = 1; i <= 10; i++) {
      tables.push({
        tableNumber: i,
        name: `Table ${i}`,
        basePrice: 12,
        isActive: true,
        hardware_id: `TABLE_${i}` // 🔥 REQUIRED FIX
      });
    }

    await Table.insertMany(tables);

    return res.status(200).json({
      message: "Tables seeded successfully",
      count: tables.length
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;