const express = require("express")
const router = express.Router()

const Stripe = require("stripe")
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

const Booking = require("../models/Booking")



/*
CREATE STRIPE CHECKOUT
LOCK PAYMENT FIRST
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

      {
        new: true
      }

    )

    if (!booking) {

      return res.status(409).json({
        error: "Another user is currently completing payment"
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

    console.error("Stripe checkout error:", err)

    res.status(500).json({
      error: "Could not create checkout session"
    })

  }

})



/*
STRIPE WEBHOOK
*/

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {

    const sig = req.headers["stripe-signature"]

    let event

    try {

      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )

    } catch (err) {

      console.log("Webhook signature error:", err.message)

      return res.status(400).send(`Webhook Error: ${err.message}`)

    }



    if (event.type === "checkout.session.completed") {

      const session = event.data.object
      const bookingId = session.metadata.bookingId

      const booking = await Booking.findById(bookingId)

      if (!booking) {
        return res.json({ received: true })
      }


      /*
      PAYMENT ARRIVED AFTER WALLET PAYMENT
      */

      if (booking.status === "confirmed") {

        console.log("Stripe payment arrived after wallet payment → refund")

        await stripe.refunds.create({
          payment_intent: session.payment_intent
        })

        return res.json({ received: true })
      }


      /*
      PAYMENT ARRIVED AFTER EXPIRY
      */

      if (booking.expiresAt < new Date()) {

        console.log("Stripe payment arrived after expiry → refund")

        await stripe.refunds.create({
          payment_intent: session.payment_intent
        })

        await Booking.updateOne(
          { _id: bookingId },
          { status: "expired", paymentLock: false }
        )

        return res.json({ received: true })
      }


      /*
      VALID PAYMENT
      */

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

  }
)



module.exports = router