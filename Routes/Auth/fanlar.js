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

// 📌 routes/userResults.js

router.get("/user-results/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;

    // 1️⃣ Results bilan birga answersni olish
    const { data: results, error } = await supabase
      .from("results")
      .select(`
        id,
        user_id,
        correct_answers,
        total_questions,
        score_percentage,
        created_at,
        users ( username ),
        answers (
          id,
          question_id,
          user_answer,
          correct_answer,
          is_correct,
          created_at
        )
      `)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 2️⃣ Natijalar bo‘sh bo‘lsa
    if (!results || results.length === 0) {
      return res.json({ results: [] });
    }

    // 3️⃣ JSON qaytarish (frontend PDF yasashi uchun)
    res.json({ results });

  } catch (err) {
    console.error("Route error:", err);
    res.status(500).json({ error: "Ichki server xatosi (JSON)" });
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