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

    // Supabase’dan subjectId bo‘yicha natijalar
    const { data, error } = await supabase
      .from("results")
      .select("user_id, correct_answers, total_questions, score_percentage, created_at")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    // PDF tayyorlash
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="subject-${subjectId}-results.pdf"`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text(`Fan bo‘yicha natijalar`, { align: "center" });
    doc.moveDown().fontSize(12).text(`Subject ID: ${subjectId}`).moveDown();

    if (!data || data.length === 0) {
      doc.text("Bu subject uchun natijalar topilmadi.");
      doc.end();
      return;
    }

    // Foydalanuvchilar natijalarini chiqarish
    data.forEach((r, i) => {
      doc.text(`${i + 1}) User ID: ${r.user_id}`);
      doc.text(`   To‘g‘ri: ${r.correct_answers} / ${r.total_questions}`);
      doc.text(`   Foiz: ${r.score_percentage}%`);
      doc.text(`   Sana: ${new Date(r.created_at).toLocaleString()}`);
      doc.moveDown(0.8);
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
