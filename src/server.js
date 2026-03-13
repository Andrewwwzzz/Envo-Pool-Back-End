require("dotenv").config()

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")

const bookingRoutes = require("./routes/booking.routes")
const paymentRoutes = require("./routes/payment.routes")

const app = express()



/*
Stripe webhook must receive raw body
*/
app.use("/api/payments/webhook", express.raw({ type: "application/json" }))

app.use(express.json())
app.use(cors())



/*
Routes
*/
app.use("/api/bookings", bookingRoutes)
app.use("/api/payments", paymentRoutes)



/*
Health check
*/
app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})



/*
Start server ONLY after MongoDB connects
*/
async function startServer() {

  try {

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    })

    console.log("MongoDB connected")

    /*
    Start background workers AFTER DB connection
    */
    

    const PORT = process.env.PORT || 3000

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })

  } catch (error) {

    console.error("MongoDB connection failed:", error)

    process.exit(1)

  }

}

startServer()