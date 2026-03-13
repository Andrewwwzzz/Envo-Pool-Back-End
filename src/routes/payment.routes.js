const express = require("express")
const router = express.Router()

const Stripe = require("stripe")
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

const Booking = require("../models/Booking")
const Table = require("../models/table")



/*
CREATE STRIPE CHECKOUT
*/
router.post("/create-checkout", async (req, res) => {

  try {

    const { bookingId } = req.body

    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: "pending_payment",
        paymentLock: false
      },
      {
        paymentLock: true
      },
      { new: true }
    )

    if (!booking) {
      return res.status(409).json({
        error: "This session has just been reserved by another user."
      })
    }

    if (booking.expiresAt < new Date()) {

      await Booking.updateOne(
        { _id: bookingId },
        { paymentLock: false }
      )

      return res.status(409).json({
        error: "This session has just been reserved by another user."
      })
    }

    const table = await Table.findById(booking.tableId)

    if (!table) {

      await Booking.updateOne(
        { _id: bookingId },
        { paymentLock: false }
      )

      return res.status(404).json({
        error: "Table not found"
      })
    }

    const amount = table.basePrice * 100

    const session = await stripe.checkout.sessions.create({

      payment_method_types: ["paynow"],

      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "sgd",
            product_data: {
              name: `Pool Table ${table.tableNumber} Reservation`
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],

      metadata: {
        bookingId: bookingId
      },

      success_url:
        "https://anytimepoolsg.com/booking-success?session_id={CHECKOUT_SESSION_ID}",

      cancel_url:
        "https://anytimepoolsg.com/booking-cancelled"

    })

    await Booking.updateOne(
      { _id: bookingId },
      { stripeSessionId: session.id }
    )

    res.json({
      url: session.url
    })

  } catch (err) {

    console.log("Stripe checkout error:", err)

    if (req.body.bookingId) {
      await Booking.updateOne(
        { _id: req.body.bookingId },
        { paymentLock: false }
      )
    }

    res.status(500).json({
      error: "Could not create checkout session"
    })

  }

})



/*
STRIPE WEBHOOK
*/
router.post("/webhook", async (req, res) => {

  let event

  try {

    const sig = req.headers["stripe-signature"]

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

  } catch (err) {

    console.log("Webhook verification failed:", err.message)

    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {

    if (event.type === "checkout.session.completed") {

      const session = event.data.object
      const bookingId = session.metadata.bookingId

      const booking = await Booking.findById(bookingId)

      if (!booking) {
        return res.json({ received: true })
      }

      /*
      Prevent duplicate webhook processing
      */
      if (booking.paymentStatus === "paid") {
        return res.json({ received: true })
      }

      /*
      Late payment protection
      */
      if (booking.expiresAt < new Date()) {

        console.log("Late payment detected, refunding:", bookingId)

        await stripe.refunds.create({
          payment_intent: session.payment_intent
        })

        await Booking.updateOne(
          { _id: bookingId },
          {
            status: "expired",
            paymentLock: false
          }
        )

        return res.json({ received: true })
      }

      await Booking.updateOne(
        { _id: bookingId },
        {
          status: "confirmed",
          paymentStatus: "paid",
          paymentLock: false
        }
      )

      console.log("Booking confirmed:", bookingId)

    }

    res.json({ received: true })

  } catch (err) {

    console.log("Webhook processing error:", err)

    res.json({ received: true })

  }

})



module.exports = router