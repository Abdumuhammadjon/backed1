const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabase } = require("../../config/supabaseClient");

const redisClient = require("../../redisClient");
require("dotenv").config();

// Supabase ulanish


// 📌 Ro‘yxatdan o‘tish (Register)
const register = async (req, res) => {
  try {
    let { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Barcha maydonlarni to‘ldiring!" });
    }

    email = email.trim().toLowerCase();
    if (password.length < 6) {
      return res.status(400).json({ message: "Parol kamida 6 ta belgidan iborat bo‘lishi kerak!" });
    }

    // Email mavjudligini tekshirish
    const { data: existingUser, error: fetchError } = await supabase.from("users").select("email").eq("email", email).single();
    if (fetchError && fetchError.code !== "PGRST116") return res.status(500).json({ message: "Tekshirishda xato" });
    if (existingUser) return res.status(400).json({ message: "Bu email allaqachon ro‘yxatdan o‘tgan." });

    // Parolni shifrlash
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === "admin" ? "admin" : "user";

    // Foydalanuvchini yaratish
    const { data: user, error } = await supabase.from("users").insert({ username, email, password: hashedPassword, role: userRole }).select("id, role").single();
    if (error) throw error;

    res.status(201).json({ message: "Foydalanuvchi muvaffaqiyatli ro‘yxatdan o‘tdi!", userId: user.id, role: user.role });
  } catch (error) {
    // console.error("Ro‘yxatdan o‘tishda xatolik:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};


// 📌 Kirish (Login)
const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // 🔍 1. Kiruvchi ma'lumotlarni tekshirish
    if (!email || !password) {
      return res.status(400).json({ message: "Email va parol kiritilishi shart!" });
    }

    // 🔤 2. Kiritilgan ma'lumotlarni tayyorlash
    email = email.trim().toLowerCase();
    password = password.trim();

    let user;

    // 🚀 3. Avval Redis keshidan foydalanuvchini qidiramiz
    const cachedUserData = await redisClient.get(`user-data:${email}`);

    if (cachedUserData) {
      user = JSON.parse(cachedUserData);

      // ⚠️ 3.1. Keshda bo‘lsa ham, bazada foydalanuvchi mavjudligini tekshiramiz (ehtiyot chorasi)
      const { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (dbError || !dbUser) {
        await redisClient.del(`user-data:${email}`);
        return res.status(403).json({ message: "Foydalanuvchi mavjud emas!" });
      }
    } else {
      // 🗄️ 4. Redisda topilmasa — Supabase’dan olib kelamiz
      const { data, error } = await supabase
        .from("users")
        .select("id, email, password, role")
        .eq("email", email)
        .single();

      if (error || !data) {
        return res.status(400).json({ message: "Email yoki parol noto‘g‘ri!" });
      }

      user = data;

      // 👑 4.1. Agar admin bo‘lsa — subjectId ni aniqlaymiz
      if (user.role === "admin") {
        const { data: subjectData, error: subjectError } = await supabase
          .from("subjects")
          .select("id")
          .eq("admin", user.id)
          .single();

        user.subjectId = !subjectError && subjectData ? subjectData.id : null;
      } else {
        user.subjectId = null;
      }

      // 💾 4.2. Redisga foydalanuvchini 1 soatga keshga qo‘shamiz
      await redisClient.setEx(`user-data:${email}`, 3600, JSON.stringify(user));
    }

    // 🔐 5. Parolni tekshiramiz
    const isMatch = user.password && (await bcrypt.compare(password, user.password));
    if (!isMatch) {
      return res.status(400).json({ message: "Email yoki parol noto‘g‘ri!" });
    }

    // 🎫 6. JWT token yaratamiz
    const tokenPayload = { id: user.id, role: user.role };
    if (user.role === "admin" && user.subjectId) {
      tokenPayload.subjectId = user.subjectId;
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1h" });

    // 🧠 7. Redis’da token va subjectId ni saqlaymiz
    await redisClient.setEx(`user-token:${user.id}`, 3600, JSON.stringify({
      token,
      subjectId: user.subjectId || null,
    }));

    // 🍪 8. Cookie sifatida tokenni yuboramiz
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.JWT_SECRET, // `true` yoki `false` bo'lishi kerak — bu yerda ehtimol xato bor
      sameSite: "Strict",
      maxAge: 3600000, // 1 soat
    });

    // ✅ 9. Muvaffaqiyatli javob
    return res.status(200).json({
      message: "Tizimga muvaffaqiyatli kirdingiz!",
      token,
      subjectId: user.subjectId || undefined,
      adminId: user.id,
    });
  } catch (error) {
    console.error("Login xatoligi:", error);
    return res.status(500).json({ message: "Server xatosi!" });
  }
};




const verifyToken = async (req, res) => {
  const { token } = req.body;
  //console.log('res', token);

  if (!token) {
    return res.status(401).json({ message: "Token kerak!" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔍 Redis tokenni tekshirish
    const redisTokenData = await redisClient.get(`user-token:${decoded.id}`);
    if (!redisTokenData) {
      return res.status(401).json({ message: "Token noto‘g‘ri yoki muddati tugagan!" });
    }

    const { token: storedToken } = JSON.parse(redisTokenData);
    if (storedToken !== token) {
      return res.status(401).json({ message: "Token noto‘g‘ri yoki muddati tugagan!" });
    }

    res.json({ message: "Token yaroqli!", user: decoded });
  } catch (err) {
    res.status(401).json({ message: "Token noto‘g‘ri yoki eskirgan!" });
  }
};




module.exports = { register, login, verifyToken };
