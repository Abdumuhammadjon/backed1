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

    // Jadval ustunlari kengliklari
    const colWidths = { index: 30, username: 120, answers: 100, percent: 60, date: 150 };
    let startX = 50;
    let rowY = doc.y;

    // Jadval sarlavhalari
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("№", startX, rowY, { width: colWidths.index });
    doc.text("Username", startX + colWidths.index, rowY, { width: colWidths.username });
    doc.text("To‘g‘ri/Umumiy", startX + colWidths.index + colWidths.username, rowY, { width: colWidths.answers });
    doc.text("Foiz", startX + colWidths.index + colWidths.username + colWidths.answers, rowY, { width: colWidths.percent });
    doc.text("Sana/Soat", startX + colWidths.index + colWidths.username + colWidths.answers + colWidths.percent, rowY, { width: colWidths.date });

    rowY += 20;
    doc.moveTo(startX, rowY).lineTo(550, rowY).stroke();

    // Jadval ma'lumotlari
    doc.font("Helvetica").fontSize(11);
    data.forEach((r, i) => {
      const dateStr = new Date(r.created_at).toLocaleString("uz-UZ");

      doc.text(i + 1, startX, rowY, { width: colWidths.index });
      doc.text(r.users?.username || r.user_id, startX + colWidths.index, rowY, { width: colWidths.username });
      doc.text(`${r.correct_answers}/${r.total_questions}`, startX + colWidths.index + colWidths.username, rowY, { width: colWidths.answers });
      doc.text(`${r.score_percentage}%`, startX + colWidths.index + colWidths.username + colWidths.answers, rowY, { width: colWidths.percent });
      doc.text(dateStr, startX + colWidths.index + colWidths.username + colWidths.answers + colWidths.percent, rowY, { width: colWidths.date });

      rowY += 20;
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


router.delete("/question/:id",  deleteQuestion )
router.delete("/userResult/:id",  deleteUserResult )
module.exports = router;
