const express = require("express");
const { register, login, verifyToken } = require("../../Controllers/Auth/auth");
const authenticate = require("../../middleware/middleware");
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiter sozlamasi
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => {
      const key = req.body.email || req.ip;
      console.log(`So‘rov kaliti: ${key}`);
      return key;
    },
    handler: (req, res) => {
      console.log("Chegara oshdi!");
      res.status(429).json({
        message: "Juda ko‘p urinish! 15 daqiqa kuting",
      });
    },
  });

// Routelar
router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/verify-token",  verifyToken);


// router.get("/profile", authenticate, (req, res) => {
//   res.json({ message: `Xush kelibsiz, foydalanuvchi ID: ${req.user.id}` });
// });

module.exports = router;