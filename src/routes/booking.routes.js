const express = require("express")
const router = express.Router()

const Booking = require("../models/Booking")
const Table = require("../models/table")



/*
CREATE BOOKING
*/
router.post("/create", async (req, res) => {

  try {

    const { userId, tableId, sessionId } = req.body

    console.log("BOOKING REQUEST:", req.body)



    const table = await Table.findOne({ hardwareId: tableId })

    if (!table) {

      return res.status(404).json({
        error: "Table not found"
      })

    }



    /*
    Check for existing booking
    */
    const existing = await Booking.findOne({

      tableId: table._id,
      sessionId: sessionId,
      status: { $in: ["pending_payment", "confirmed"] }

    })



    if (existing) {

      return res.status(409).json({
        error: "Session already booked"
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