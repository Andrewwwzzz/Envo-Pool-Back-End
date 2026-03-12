const express = require("express")
const router = express.Router()

const Booking = require("../models/Booking")
const Table = require("../models/table")

router.post("/create", async (req, res) => {

  try {

    const { userId, tableId, sessionId } = req.body

    console.log("BOOKING REQUEST:", req.body)

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


    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)


    /*
    ATOMIC BOOKING CREATION
    Prevents race condition
    */
    const booking = await Booking.findOneAndUpdate(

      {
        tableId: table._id,
        sessionId: sessionId,
        status: { $in: ["pending_payment", "confirmed"] }
      },

      {},

      { new: true }

    )


    if (booking) {

      return res.json({
        message: "Booking already exists",
        bookingId: booking._id
      })

    }


    const newBooking = new Booking({

      userId,
      tableId: table._id,
      sessionId,

      status: "pending_payment",
      paymentStatus: "unpaid",
      paymentLock: false,

      expiresAt

    })


    await newBooking.save()


    return res.json({

      message: "Booking created",
      bookingId: newBooking._id

    })


  } catch (error) {

    console.error("Booking creation error:", error)

    return res.status(500).json({
      error: "Booking creation failed"
    })

  }

})

module.exports = router