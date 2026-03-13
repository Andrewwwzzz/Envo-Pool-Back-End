const express = require("express")
const router = express.Router()

/*
JWKS endpoint required by Singpass
*/
router.get("/.well-known/jwks.json", (req, res) => {

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

module.exports = router