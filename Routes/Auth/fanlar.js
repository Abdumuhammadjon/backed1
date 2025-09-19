const express = require("express");
const router = express.Router();
const { supabase } = require("../../config/supabaseClient");

const PDFDocument = require("pdfkit");
const {
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject, checkUserAnswers  , getUserResultsPDF,  deleteUserResult,  deleteQuestion,  getUserResults,  getUserResult, getQuestionsBySubject,
} = require("../../Controllers/Auth/fanlar");

const {
   getAdmins, 
} = require("../../Controllers/Auth/fanlar")


router.get("/admins", getAdmins);

router.post("/subjects", createSubject);
router.post("/save-answers", checkUserAnswers );
router.get("/subjects", getSubjects);
router.put("/subjects/:id", updateSubject);
router.delete("/subjects/:id", deleteSubject);
router.get("/subject/:id", getQuestionsBySubject)
router.get("/userResults/:id",  getUserResults )
router.get("/userResults",  getUserResult )

router.get("/user-results/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;

    const { data, error } = await supabase
      .from("results")
      .select(`
        user_id,
        correct_answers,
        total_questions,
        score_percentage,
        created_at,
        users(username)
      `)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="subject-${subjectId}-results.pdf"`
    );

   const doc = new PDFDocument({ margin: 50, size: "A4", layout: "landscape" });

    doc.pipe(res);

    // Header
    doc.fontSize(18).text("📊 Fan bo‘yicha natijalar", { align: "center" });
    doc.moveDown().fontSize(12).text(`Subject ID: ${subjectId}`, { align: "center" });
    doc.moveDown(2);

    if (!data || data.length === 0) {
      doc.text("❌ Bu subject uchun natijalar topilmadi.");
      doc.end();
      return;
    }

   
    
   // Jadval ustunlari kengliklari (biroz kengaytirdim)
const colWidths = { index: 30, username: 150, answers: 100, percent: 60, date: 180 };
let startX = 50;
let rowY = doc.y;

// Jadval sarlavhalari
doc.fontSize(12).font("Helvetica-Bold");
doc.text("№", startX, rowY, { width: colWidths.index, align: "center" });
doc.text("Username", startX + colWidths.index, rowY, { width: colWidths.username, ellipsis: true });
doc.text("To‘g‘ri/Umumiy", startX + colWidths.index + colWidths.username, rowY, { width: colWidths.answers, align: "center" });
doc.text("Foiz", startX + colWidths.index + colWidths.username + colWidths.answers, rowY, { width: colWidths.percent, align: "center" });
doc.text("Sana/Soat", startX + colWidths.index + colWidths.username + colWidths.answers + colWidths.percent, rowY, { width: colWidths.date, ellipsis: true });

rowY += 20;
doc.moveTo(startX, rowY).lineTo(550, rowY).stroke();

// Jadval ma'lumotlari
doc.font("Helvetica").fontSize(11);
data.forEach((r, i) => {
  const dateStr = new Date(r.created_at).toLocaleString("uz-UZ");

  doc.text(i + 1, startX, rowY, { width: colWidths.index, align: "center" });
  doc.text(r.users?.username || r.user_id, startX + colWidths.index, rowY, {
    width: colWidths.username,
    ellipsis: true,
  });
  doc.text(`${r.correct_answers}/${r.total_questions}`, startX + colWidths.index + colWidths.username, rowY, {
    width: colWidths.answers,
    align: "center",
  });
  doc.text(`${r.score_percentage}%`, startX + colWidths.index + colWidths.username + colWidths.answers, rowY, {
    width: colWidths.percent,
    align: "center",
  });
  doc.text(dateStr, startX + colWidths.index + colWidths.username + colWidths.answers + colWidths.percent, rowY, {
    width: colWidths.date,
    ellipsis: true,
  });

  rowY += 20;

  // Agar sahifa tugasa, yangi sahifa ochiladi
  if (rowY > 750) {
    doc.addPage();
    rowY = 50;
  }

  doc.moveTo(startX, rowY - 5).lineTo(550, rowY - 5).strokeColor("#cccccc").stroke();
});


    doc.end();
  } catch (err) {
    console.error("Route error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Ichki server xatosi (PDF)" });
    }
  }
});

router.get("/subject-questions/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;

    if (!subjectId) {
      return res.status(400).json({ error: "subjectId majburiy!" });
    }

    // subject nomini olish
    const { data: subjectData } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", subjectId)
      .single();

    // savollarni olish
    const { data: questions, error } = await supabase
      .from("questions")
      .select("id, question_text, created_at")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // PDF tayyorlash
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="subject-${subjectId}-questions.pdf"`
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    // Header
    doc.fontSize(18).text("📘 Fan bo‘yicha savollar", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Subject: ${subjectData?.name || subjectId}`, {
      align: "center",
    });
    doc.moveDown(2);

    if (!questions || questions.length === 0) {
      doc.text("❌ Bu fan uchun savollar topilmadi.");
      doc.end();
      return;
    }

    // Har bir savolni chiqarish
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Savol matni
      doc.font("Helvetica-Bold").fontSize(12).text(`${i + 1}) ${q.question_text}`);
      doc.moveDown(0.3);

      // Variantlarini olish
      const { data: options } = await supabase
        .from("options")
        .select("option_text, is_correct")
        .eq("question_id", q.id);

      if (options && options.length > 0) {
        options.forEach((opt, idx) => {
          let prefix = String.fromCharCode(97 + idx) + ")"; // a), b), c) ...
          let text = `${prefix} ${opt.option_text}`;
          if (opt.is_correct) {
            // to‘g‘ri javobni belgili qilish
            doc.fillColor("green").text(text + " ✅");
          } else {
            doc.fillColor("black").text(text);
          }
        });
      }

      doc.moveDown(1);
    }

    doc.end();
  } catch (err) {
    console.error("Route error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "PDF yaratishda xato" });
    }
  }
});


router.delete("/question/:id",  deleteQuestion )
router.delete("/userResult/:id",  deleteUserResult )
module.exports = router;
