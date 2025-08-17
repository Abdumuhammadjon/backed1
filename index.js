const express = require("express");
const app = express();
const pool = require("./postgres/db.js");
const redis = require("./redis/redis.js");
const authRoutes = require("./Routes/Auth/auth.js");
const questions = require("./Routes/Auth/QuestionRouter.js");
const fanlar = require("./Routes/Auth/fanlar.js");
require("dotenv").config();
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require("cookie-parser");


const PORT = process.env.PORT || 5000;

// HTTPS'ga majburlash (agar Render HTTPS dan foydalansa)
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// Health-check uchun yengil route (UptimeRobot uchun)
app.get("/health", (req, res) => {
  res.status(200).send("✅ Backend ishlayapti. Health check OK.");
});




app.use(express.json());
app.use(cors({
  origin: "https://frontend3-o8cd.onrender.com", // Frontend URL
  credentials: true,
}));
app.use(cookieParser());
app.use(helmet());

// Routers
app.use("/auth", authRoutes);
app.use("/api", questions);
app.use("/api", fanlar);

// Redis test route
app.get("/cache", async (req, res) => {
  try {
    let data = await redis.get("myKey");

    if (!data) {
      console.log("🔄 Ma'lumot bazadan olinmoqda...");
      data = { message: "Salom, bu Redis cache dan!" };
      await redis.set("myKey", JSON.stringify(data), "EX", 60);
    } else {
      console.log("✅ Cache-dan olingan ma'lumot!");
      data = JSON.parse(data);
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Xatolik:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Default route — bazani test qiladi
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.send("✅ Baza ishlayapti. Server online.");
    console.log("📦 Baza so'rovi bajarildi:", result.rows[0]);
  } catch (err) {
    console.error("❌ Bazaga ulanishda xatolik:", err);
    res.status(500).send("❌ Server xatosi");
  }
});

// Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portda ishlayapti`);
});
