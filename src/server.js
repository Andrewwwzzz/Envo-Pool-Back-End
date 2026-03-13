console.log("backend updated")

require("dotenv").config()

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")

const bookingRoutes = require("./routes/booking.routes")
const paymentRoutes = require("./routes/payment.routes")

// Singpass routes
const authRoutes = require("./routes/auth.routes")
const jwksRoutes = require("./routes/jwks.routes")

const app = express()

/*
Stripe webhook must receive raw body
*/
app.use("/api/payments/webhook", express.raw({ type: "application/json" }))

app.use(express.json())
app.use(cors())

/*
JWKS endpoint for Singpass
*/
app.get("/.well-known/jwks.json", (req, res) => {

  const jwk = {
    kty: "EC",
    crv: "P-256",
    use: "sig",
    alg: "ES256",
    kid: process.env.SIGNING_KID,
    x: process.env.SIGNING_PUBLIC_X,
    y: process.env.SIGNING_PUBLIC_Y
  }

  res.json({
    keys: [jwk]
  })

})

/*
TEST ROUTE
*/
app.get("/test", (req, res) => {
  res.json({ message: "server working" })
})

/*
Routes
*/
app.use("/api/bookings", bookingRoutes)
app.use("/api/payments", paymentRoutes)

// Singpass authentication routes
app.use("/api/auth", authRoutes)

// JWKS endpoint
app.use("/", jwksRoutes)

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

    require("./jobs/expireBookings")

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