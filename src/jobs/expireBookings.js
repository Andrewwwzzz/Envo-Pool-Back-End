const cron = require("node-cron")
const Booking = require("../models/Booking")

cron.schedule("*/15 * * * * *", async () => {

  try {

    const result = await Booking.deleteMany({
      status: "pending_payment",
      expiresAt: { $lt: new Date() }
    })

    if (result.deletedCount > 0) {
      console.log("Expired bookings deleted:", result.deletedCount)
    }

  } catch (err) {
    console.log("Expire booking error:", err)
  }

})