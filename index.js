const express = require("express");
const app = express();
const pool = require("./postgres/db.js");
const redis = require("./redis/redis.js");
const authRoutes = require("./Routes/Auth/auth.js");
const questions = require("./Routes/Auth/QuestionRouter.js");
const fanlar = require("./Routes/Auth/fanlar.js");
require("dotenv").config();
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const PORT = process.env.PORT || 5000;

// HTTPS'ga majburlash (Render.com uchun)
app.use((req, res, next) => {
  if (req.headers["x-forwarded-proto"] !== "https" && process.env.NODE_ENV === "production") {
    return res.redirect("https://" + req.headers.host + req.url);
  }
  next();
});

// Middleware'lar
app.use(express.json());
app.use(
  cors({
    origin: "https://frontend3-o8cd.onrender.com", // Frontend URL
    credentials: true,
  })
);
app.use(cookieParser());
app.use(helmet());

// UptimeRobot uchun engil /ping endpointi
app.get("/ping", (req, res) => {
  res.status(200).send("OK"); // Oddiy va tez javob
});

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
    console.error("❌ Redis xatolik:", error);
    res.status(500).json({ error: "Redis xatosi" });
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

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Global xatolik:", err.stack);
  res.status(500).json({ error: "Serverda xatolik yuz berdi" });
});

// Serverni ishga tushirish
app.listen(PORT, async () => {
  try {
    // Postgres va Redis ulanishlarini tekshirish
    await pool.query("SELECT NOW()"); // Postgres ulanishini test qilish
    console.log("✅ Postgres ulanishi muvaffaqiyatli!");
    await redis.set("test", "OK", "EX", 10); // Redis ulanishini test qilish
    console.log("✅ Redis ulanishi muvaffaqiyatli!");
    console.log(`🚀 Server ${PORT} portda ishlayapti`);
  } catch (error) {
    console.error("❌ Ulanishda xatolik:", error);
    process.exit(1); // Xatolik bo'lsa serverni to'xtatish
  }
});

// Server crash bo'lsa log qilish
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
