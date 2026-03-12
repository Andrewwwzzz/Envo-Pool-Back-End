const cron = require("node-cron")
const Booking = require("../models/Booking")

cron.schedule("* * * * *", async () => {

  try {

    const result = await Booking.deleteMany({

      status: "pending_payment",

      expiresAt: { $lt: new Date() }

    })

    if (result.deletedCount > 0) {

      console.log("Expired pending bookings removed:", result.deletedCount)

    }

  } catch (error) {

    console.log("Expire booking error:", error)

  }

})