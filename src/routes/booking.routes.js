const express = require("express")
const router = express.Router()

const Booking = require("../models/Booking")
const Table = require("../models/table") // keep lowercase if your file is table.js

/*
CREATE BOOKING
*/
router.post("/create", async (req, res) => {

  try {

    const { userId, tableId, sessionId } = req.body

    console.log("BOOKING REQUEST:", req.body)

    if (!userId | !tableId | !sessionId) {

      return res.status(400).json({
        error: "Missing required fields"
      })

    }

    /*
    IMPORTANT: your Mongo field is hardware_id
    */
    const table = await Table.findOne({ hardware_id: tableId })

    if (!table) {

      console.log("Table not found for hardware_id:", tableId)

      return res.status(404).json({
        error: "Table not found"
      })

    }

    /*
    Check if session already booked
    */
    const existing = await Booking.findOne({

      tableId: table._id,
      sessionId: sessionId,
      status: { $in: ["pending_payment", "confirmed"] }

    })

    if (existing) {

      return res.json({
        message: "Booking already exists",
        bookingId: existing._id
      })

    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    const booking = new Booking({

      userId,
      tableId: table._id,
      sessionId,

      status: "pending_payment",
      paymentStatus: "unpaid",
      paymentLock: false,
      expiresAt

    })

    await booking.save()

    console.log("Booking created:", booking._id)

    return res.json({

      message: "Booking created",
      bookingId: booking._id

    })

  } catch (error) {

    console.error("Booking creation error:", error)

    return res.status(500).json({
      error: "Booking creation failed"
    })

  }

})

module.exports = router