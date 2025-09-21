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

    // 1️⃣ Natijalarni olish
    const { data: results, error: resultsError } = await supabase
      .from("results")
      .select(`
        id,
        user_id,
        correct_answers,
        total_questions,
        score_percentage,
        created_at,
        users(username)
      `)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (resultsError) throw resultsError;

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

    if (!results || results.length === 0) {
      doc.text("❌ Bu subject uchun natijalar topilmadi.");
      doc.end();
      return;
    }

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const dateStr = new Date(r.created_at).toLocaleString("uz-UZ");

      // 2️⃣ Foydalanuvchi umumiy natijasi
      doc.fontSize(12).font("Helvetica-Bold").text(
        `${i + 1}. ${r.users?.username || r.user_id} | To‘g‘ri: ${r.correct_answers}/${r.total_questions} | Foiz: ${r.score_percentage}% | Sana: ${dateStr}`
      );
      doc.moveDown(0.5);

      // 3️⃣ Har bir savol va javoblarni olish
      const { data: answers, error: answersError } = await supabase
        .from("answers")
        .select("*")
        .eq("result_id", r.id)
        .order("created_at", { ascending: true });

      if (answersError) throw answersError;

      // Jadval sarlavhalari
      doc.font("Helvetica-Bold").fontSize(11);
      doc.text("№", { continued: true, width: 30 });
      doc.text("Savol matni", { continued: true, width: 300 });
      doc.text("Foydalanuvchi javobi", { continued: true, width: 150 });
      doc.text("To‘g‘ri javob", { width: 150 });
      doc.moveDown(0.5);

      doc.font("Helvetica").fontSize(11);
      answers.forEach((ans, idx) => {
        doc.text(idx + 1, { continued: true, width: 30 });
        doc.text(ans.question_text, { continued: true, width: 300, ellipsis: true });
        doc.text(ans.user_answer, { continued: true, width: 150, ellipsis: true });
        doc.text(ans.correct_answer, { width: 150, ellipsis: true });
        doc.moveDown(0.3);

        // Sahifa chekkasi
        if (doc.y > 750) {
          doc.addPage();
        }
      });

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(750, doc.y).strokeColor("#cccccc").stroke();
      doc.moveDown(1);

      // Agar sahifa tugasa, yangi sahifa ochiladi
      if (doc.y > 700) {
        doc.addPage();
      }
    }

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