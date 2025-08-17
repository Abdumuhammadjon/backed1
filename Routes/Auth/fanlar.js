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

/
router.get("/user-results/:subjectId", async (req, res) => {
  try {
    const { subjectId } = req.params;
    if (!subjectId) {
      return res.status(400).json({ error: "subjectId majburiy" });
    }

    // results + users join qilish
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

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    // PDF sozlamalari
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="subject-${subjectId}-results.pdf"`
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
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

    // Jadval sarlavhalari
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("№", 50, doc.y, { continued: true });
    doc.text("Username", 80, doc.y, { width: 150, continued: true });
    doc.text("To‘g‘ri/Umumiy", 250, doc.y, { width: 120, continued: true });
    doc.text("Foiz", 370, doc.y, { width: 60, continued: true });
    doc.text("Sana", 440, doc.y);
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // chiziq chizish

    // Jadval ichidagi ma'lumotlar
    doc.font("Helvetica");
    data.forEach((r, i) => {
      doc.text(i + 1, 50, doc.y, { continued: true });
      doc.text(r.users?.username || r.user_id, 80, doc.y, { width: 150, continued: true });
      doc.text(`${r.correct_answers}/${r.total_questions}`, 250, doc.y, { width: 120, continued: true });
      doc.text(`${r.score_percentage}%`, 370, doc.y, { width: 60, continued: true });
      doc.text(new Date(r.created_at).toLocaleDateString(), 440, doc.y);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error("Route error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Ichki server xatosi (PDF)" });
    } else {
      try { res.end(); } catch (_) {}
    }
  }
});

router.delete("/question/:id",  deleteQuestion )
router.delete("/userResult/:id",  deleteUserResult )
module.exports = router;
