const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabase } = require("../../config/supabaseClient");
require("dotenv").config();


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

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ message: "Bu email allaqachon ro‘yxatdan o‘tgan." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === "admin" ? "admin" : "user";

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        username,
        email,
        password: hashedPassword,
        role: userRole
      })
      .select("id, role")
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "Foydalanuvchi muvaffaqiyatli ro‘yxatdan o‘tdi!",
      userId: user.id,
      role: user.role
    });

  } catch (error) {
    console.error("Register xato:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};


// 📌 Kirish (Login)
const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email va parol kiritilishi shart!" });
    }

    email = email.trim().toLowerCase();
    password = password.trim();

    // 1️⃣ Userni topamiz
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, password, role")
      .eq("email", email)
      .maybeSingle();

    if (error || !user) {
      return res.status(400).json({ message: "Email yoki parol noto‘g‘ri!" });
    }

    // 2️⃣ Parol tekshirish
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Email yoki parol noto‘g‘ri!" });
    }

    // 3️⃣ SUBJECTS jadvalidan admin ni tekshiramiz
// 3️⃣ subjects jadvalidan fanini tekshiramiz
const { data: subject } = await supabase
  .from("subjects")
  .select("id, name")
  .eq("admin", user.id)   // MUHIM JOY
  .maybeSingle();
    
    // 4️⃣ Token yaratish
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 3600000
    });

    return res.status(200).json({
  message: "Tizimga muvaffaqiyatli kirdingiz!",
  token,
  subject_id: subject ? subject.id : null,
  subject_name: subject ? subject.name : null
});

  } catch (error) {
    console.error("Login xatoligi:", error);
    return res.status(500).json({ message: "Server xatosi!" });
  }
};


// 📌 Token tekshirish (Redis siz)
const verifyToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ message: "Token kerak!" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ message: "Token yaroqli!", user: decoded });

  } catch (err) {
    res.status(401).json({ message: "Token noto‘g‘ri yoki eskirgan!" });
  }
};


module.exports = { register, login, verifyToken };
