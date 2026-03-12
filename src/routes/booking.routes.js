const express = require("express")
const router = express.Router()

const Booking = require("../models/Booking")
const Table = require("../models/table")

/*
CREATE BOOKING

Expected request body:

{
  "userId": "...Mongo ObjectId...",
  "tableId": "T1",
  "sessionId": "2026-03-18-20"
}
*/

router.post("/create", async (req, res) => {

  console.log("BOOKING REQUEST:", req.body)

  try {

    let { userId, tableId, sessionId } = req.body

    // Validate input
    if (!userId || !tableId || !sessionId) {

      return res.status(400).json({
        error: "Missing booking information"
      })

    }

    // Clean tableId (remove accidental spaces)
    tableId = tableId.toString().trim()

    /*
    Find table by hardwareId
    */
    const table = await Table.findOne({
      hardware_id: tableId
    })

    if (!table) {

      console.log("TABLE LOOKUP FAILED:", tableId)

      return res.status(404).json({
        error: "Table not found"
      })

    }

    /*
    Prevent double booking
    */
    const existingBooking = await Booking.findOne({

      tableId: table._id,
      sessionId: sessionId,
      status: { $in: ["pending_payment", "confirmed"] }

    })

    if (existingBooking) {

      return res.status(409).json({
        error: "Session already booked"
      })

    }

    /*
    Create booking
    */

    const booking = new Booking({

      userId: userId,
      tableId: table._id,
      sessionId: sessionId,

      status: "pending_payment",
      paymentStatus: "unpaid",

      // 5 minute expiry
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)

    })

    await booking.save()

    res.json({

      message: "Booking created",
      bookingId: booking._id

    })

  } catch (error) {

    console.error("Booking creation error:", error)

    res.status(500).json({
      error: "Booking creation failed"
    })

  }

})

module.exports = router