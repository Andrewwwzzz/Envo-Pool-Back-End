require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

/*
========================
INIT APP FIRST
========================
*/
const app = express();

/*
========================
MIDDLEWARE
========================
*/
app.use(cors({
  origin: [
    "https://envopoolsg.com",
    "http://localhost:3000"
  ],
  credentials: true
}));

app.use(express.json());

/*
========================
ROUTES (AFTER APP INIT)
========================
*/
const bookingRoutes = require("./routes/booking.routes");
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");

app.use("/api/bookings", bookingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

/*
========================
HEALTH CHECK
========================
*/
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/*
========================
DB CONNECTION
========================
*/
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch(err => {
    console.error("MongoDB error:", err);
  });

/*
========================
START SERVER
========================
*/
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});