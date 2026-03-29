const Booking = require("../models/Booking");

let isRunning = false;

async function expireBookings() {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();

    /*
    🔥 EXPIRE unpaid bookings
    */
    const result = await Booking.updateMany(
      {
        status: "pending_payment",
        expiresAt: { $lt: now }
      },
      {
        $set: {
          status: "expired",
          paymentLock: false
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Expired ${result.modifiedCount} unpaid bookings`);
    }

  } catch (error) {
    console.error("Expiry worker error:", error.message);
  } finally {
    isRunning = false;
  }
}

function startExpiryWorker() {
  console.log("Expiry worker started");
  setInterval(expireBookings, 60 * 1000);
}

module.exports = startExpiryWorker;