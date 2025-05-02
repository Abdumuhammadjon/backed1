const express = require("express");
const app = express();
const pool = require("./postgres/db.js");
const redis = require("./redis/redis.js"); // db.js ni import qildik
const authRoutes = require("./Routes/Auth/auth.js");
 const questions = require("./Routes/Auth/QuestionRouter.js");
 const fanlar = require("./Routes/Auth/fanlar.js")
require("dotenv").config();
const helmet = require('helmet');
const cors =require('cors')
const cookieParser = require("cookie-parser")
const PORT = process.env.PORT || 5000;

// const shortcuts = {
//   google: "https://www.google.com",
//   youtube: "https://www.youtube.com",
//   chat: "https://chat.openai.com",
//   sinftest7: "http://localhost:5000" // O'zingizning sayt URL manzilini qo‘ying
// };

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000", // Frontend URL
    credentials: true, // Cookie’lar uchun
  })
);
app.use(cookieParser());
app.use(helmet());


app.use("/auth", authRoutes)
app.use("/api", questions)
app.use("/api", fanlar)


// app.get("/:shortcut", (req, res) => {
//   console.log("Kelgan shortcut:", req.params.shortcut);
//   const url = shortcuts[req.params.shortcut];
//   if (url) {
//     res.redirect(301, url);
//   } else {
//     res.status(404).send("Bunday qisqa link mavjud emas.");
//   }
// });


app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()"); // Bazaga test so‘rov
    res.send(`Baza ishladi:  ishladiii`);
    console.log('databaza ishladi')
  } catch (err) {
    console.error(err);
    res.status(500).send("Server xatosi");
  }
});


app.get("/cache", async (req, res) => {
    try {
      let data = await redis.get("myKey");
  
      if (!data) {
        console.log("🔄 Ma'lumot bazadan olinmoqda...");
        data = { message: "Salom, bu Redis cache dan!" };
  
        await redis.set("myKey", JSON.stringify(data), "EX", 60); // 60 sekundga cache qilish
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
app.listen(PORT, () => {
  console.log(`Server ${PORT} portda ishladi`);
});
