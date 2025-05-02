const jwt = require("jsonwebtoken");
const redisClient = require("../redisClient");
require("dotenv").config();

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    console.log("Cookie’dan olingan token:", token);
    console.log("Salom");

    if (!token) {
      return res.status(401).json({ message: "Token taqdim etilmagan!" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Dekodlangan token:", decoded);

    const cachedToken = await redisClient.get(`user:${decoded.id}`);
    console.log("Redis’dan olingan token:", cachedToken);

    if (!cachedToken || cachedToken !== token) {
      return res.status(401).json({ message: "Token yaroqsiz yoki muddati o‘tgan!" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Authenticate xatosi:", error.message || error);
    return res.status(401).json({ message: "Token noto‘g‘ri!" });
  }
};

module.exports = authenticate;