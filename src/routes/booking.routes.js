const express = require("express")
const router = express.Router()

const Booking = require("../models/Booking")
const Table = require("../models/table")

router.post("/create", async (req, res) => {

  try {

    const { userId, tableId, sessionId } = req.body

    console.log("BOOKING REQUEST:", req.body)



    /*
    Validate input
    */
    if (!userId | !tableId | !sessionId) {

      console.log("Missing fields")

      return res.status(400).json({
        error: "Missing required fields"
      })

    }



    /*
    Find table
    */
    console.log("Looking for table:", tableId)

    const table = await Table.findOne({ hardwareId: tableId })

    if (!table) {

      console.log("Table not found")

      return res.status(404).json({
        error: "Table not found"
      })

    }

    console.log("Table found:", table._id)



    /*
    Check existing booking
    */
    console.log("Checking existing booking")

    const existing = await Booking.findOne({

      tableId: table._id,
      sessionId: sessionId,
      status: { $in: ["pending_payment", "confirmed"] }

    })



    if (existing) {

      console.log("Booking already exists")

      return res.json({
        message: "Booking already exists",
        bookingId: existing._id
      })

    }



    /*
    Create booking
    */
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



    console.log("Saving booking...")

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