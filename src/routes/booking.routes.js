const express = require("express")
const router = express.Router()

const Booking = require("../models/Booking")
const Table = require("../models/table")



/*
CREATE BOOKING
*/

router.post("/create", async (req, res) => {

  try {

    const { userId, tableId, startTime, endTime } = req.body

    if (!userId |!tableId | !startTime || !endTime) {

      return res.status(400).json({
        error: "Missing required fields"
      })

    }


    // convert hardwareId (T1,T2) → MongoDB table _id
    const table = await Table.findOne({ hardwareId: tableId })

    if (!table) {

      return res.status(404).json({
        error: "Table not found"
      })

    }


    const booking = new Booking({

      userId: userId,

      tableId: table._id,

      startTime: new Date(startTime),

      endTime: new Date(endTime),

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


    // Handle duplicate booking (race condition protection)
    if (error.code === 11000) {

      return res.status(409).json({
        error: "Time slot already booked"
      })

    }

    res.status(500).json({
      error: "Booking creation failed"
    })

  }

})



module.exports = router