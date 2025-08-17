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
 
router.get('/user-results.pdf', async (req, res, next) => {
  try {
    // PDF response header’lari
    res.setHeader('Content-Type', 'application/pdf');
    // "inline" — brauzerda ochadi; "attachment" — yuklaydi
    res.setHeader('Content-Disposition', 'attachment; filename="user-results.pdf"');

    // PDF’ni stream qilish
    const doc = await getUserResultsPDF(
      chunk => res.write(chunk),
      () => res.end()
    );

    // ixtiyoriy: xatolarni ushlash
    if (doc && doc.on) {
      doc.on('error', (err) => {
        // agar stream paytida xato bo'lsa, response’ni toza yopamiz
        if (!res.headersSent) {
          res.status(500);
        }
        try { res.end(); } catch (_) {}
        next(err);
      });
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/question/:id",  deleteQuestion )
router.delete("/userResult/:id",  deleteUserResult )
module.exports = router;
