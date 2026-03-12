const express = require("express")
const router = express.Router()

const Booking = require("../models/Booking")
const Table = require("../models/table")

router.post("/create", async (req, res) => {

  try {

    const { userId, tableId, sessionId } = req.body

    if (!userId | !tableId | !sessionId) {

      return res.status(400).json({
        error: "Missing required fields"
      })

    }

    const table = await Table.findOne({ hardwareId: tableId })

    if (!table) {

      return res.status(404).json({
        error: "Table not found"
      })

    }

    const booking = new Booking({

      userId: userId,

      tableId: table._id,

      sessionId: sessionId,

      status: "pending_payment",

      paymentStatus: "unpaid",

      expiresAt: new Date(Date.now() + 5 * 60 * 1000)

    })

    await booking.save()

    res.json({
      message: "Booking created",
      bookingId: booking._id
    })

  } catch (error) {

    console.log("Booking creation error:", error)

    if (error.code === 11000) {

      return res.status(409).json({
        error: "Session already booked"
      })

    }

    res.status(500).json({
      error: "Booking creation failed"
    })

  }

})

module.exports = router