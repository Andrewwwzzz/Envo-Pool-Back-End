const jwt = require("jsonwebtoken");
const User = require("../models/user");

module.exports = async function (req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: "User not found"
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Account not verified"
      });
    }

    req.user = user;
    req.userId = user._id;

    next();

  } catch (error) {
    console.error("AUTH ERROR:", error);
    res.status(401).json({
      error: "Invalid token"
    });
  }
};