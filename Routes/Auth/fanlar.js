const express = require("express");
const router = express.Router();


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

// router.get("/userResults/pdf/:id", getUserResultsPDF  )
// router.get("/userResults/pdf", getUserResultsPDF  )
 
router.get("/user-results/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId majburiy!" });
    }

    // Supabase’dan ma’lumot olish
    const { data, error } = await supabase
      .from("results")
      .select("subject_id, correct_answers, total_questions, score_percentage, created_at")
      .eq("user_id", userId);

    if (error) throw error;

    // PDF tayyorlash
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="user-${userId}-results.pdf"`
    );

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(20).text(`User ${userId} natijalari`, { align: "center" });
    doc.moveDown();

    data.forEach((result, idx) => {
      doc
        .fontSize(12)
        .text(
          `${idx + 1}. Fan: ${result.subject_id}
           To‘g‘ri javoblar: ${result.correct_answers}/${result.total_questions}
           Foiz: ${result.score_percentage}%
           Sana: ${new Date(result.created_at).toLocaleString()}`
        );
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF yaratishda xato yuz berdi" });
  }
});

router.delete("/question/:id",  deleteQuestion )
router.delete("/userResult/:id",  deleteUserResult )
module.exports = router;
