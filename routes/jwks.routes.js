const express = require("express");
const router = express.Router();

router.get("/.well-known/jwks.json", (req, res) => {
  res.json({
    keys: [
      {
        kty: "EC",
        crv: "P-256",
        use: "sig",
        alg: "ES256",
        kid: process.env.SIGNING_KID,
        x: process.env.SIGNING_PUBLIC_X,
        y: process.env.SIGNING_PUBLIC_Y
      }
    ]
  });
});

module.exports = router;