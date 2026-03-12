const express = require("express")
const router = express.Router()

const Stripe = require("stripe")
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

const Booking = require("../models/Booking")



/*
CREATE STRIPE CHECKOUT
*/
router.post("/create-checkout", async (req, res) => {

  try {

    const { bookingId, amount } = req.body

    const booking = await Booking.findOneAndUpdate(

      {
        _id: bookingId,
        paymentLock: false,
        status: "pending_payment"
      },

      {
        paymentLock: true
      },

      { new: true }

    )

    if (!booking) {

      return res.status(409).json({
        error: "Another user is already paying for this slot"
      })

    }

    if (booking.expiresAt < new Date()) {

      return res.status(400).json({
        error: "Booking expired"
      })

    }


    const session = await stripe.checkout.sessions.create({

      payment_method_types: ["paynow"],

      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "sgd",
            product_data: {
              name: "Pool Table Reservation"
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

    res.status(500).json({
      error: "Could not create checkout session"
    })

  }

})



/*
WALLET PAYMENT
*/
router.post("/wallet-pay", async (req, res) => {

  try {

    const { bookingId } = req.body

    const booking = await Booking.findById(bookingId)

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" })
    }

    if (booking.status === "confirmed") {
      return res.status(409).json({ error: "Booking already paid" })
    }

    if (booking.expiresAt < new Date()) {
      return res.status(400).json({ error: "Booking expired" })
    }


    await Booking.updateOne(
      { _id: bookingId },
      {
        status: "confirmed",
        paymentStatus: "paid",
        paymentMethod: "wallet",
        paymentLock: false
      }
    )

    res.json({
      success: true
    })

  } catch (err) {

    console.log("Wallet payment error:", err)

    res.status(500).json({
      error: "Wallet payment failed"
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
      Wallet already confirmed booking
      */
      if (booking.status === "confirmed") {

        console.log("Wallet already paid → refund Stripe")

        await stripe.refunds.create({
          payment_intent: session.payment_intent
        })

        return res.json({ received: true })
      }



      /*
      Booking expired
      */
      if (booking.expiresAt < new Date()) {

        console.log("Booking expired → refund Stripe")

        await stripe.refunds.create({
          payment_intent: session.payment_intent
        })

        await Booking.updateOne(
          { _id: bookingId },
          { status: "expired", paymentLock: false }
        )

        return res.json({ received: true })
      }/*
      Valid Stripe payment
      */
      await Booking.updateOne(
        { _id: bookingId },
        {
          status: "confirmed",
          paymentStatus: "paid",
          paymentMethod: "stripe",
          paymentLock: false
        }
      )

      console.log("Booking confirmed via Stripe:", bookingId)

    }

    res.json({ received: true })

  } catch (err) {

    console.log("Webhook processing error:", err)

    res.json({ received: true })

  }

})



module.exports = router