const { supabase } = require("../../config/supabaseClient");

function sanitizeText(text) {
  if (!text) return text;
  return text
    .replace(/'/g, "ʼ")
    .replace(/"/g, "”")
    .replace(/`/g, "´");
}

const saveQuestions = async (req, res) => {
  const { adminId, subjectId, questions } = req.body;

  if (!adminId || !subjectId || !questions || questions.length === 0) {
    return res.status(400).json({ message: "Barcha maydonlarni to‘ldiring!" });
  }

  try {
    // Har bir savolning faqat bitta to'g'ri varianti borligini tekshirish
    for (const question of questions) {
      const correctOptions = question.options.filter(opt => opt.isCorrect).length;
      if (correctOptions !== 1) {
        return res.status(400).json({
          message: "Har bir savol uchun faqat bitta to'g'ri variant belgilanishi kerak!",
        });
      }
    }

    // Har bir savol va uning variantlarini bazaga kiritish
    for (const question of questions) {
      // Savol matnini tozalash
      const cleanQuestionText = sanitizeText(question.questionText);

      // Savolni kiritish
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .insert([
          { 
            question_text: cleanQuestionText, 
            admin_id: adminId, 
            subject_id: subjectId 
          }
        ])
        .select()
        .single();

      if (questionError) {
        throw new Error(questionError.message);
      }

      const questionId = questionData.id;

      // Variantlarni tozalash va kiritish
      const optionsToInsert = question.options.map(opt => ({
        question_id: questionId,
        option_text: sanitizeText(opt.text),
        is_correct: opt.isCorrect,
      }));

      const { error: optionsError } = await supabase.from("options").insert(optionsToInsert);

      if (optionsError) {
        throw new Error(optionsError.message);
      }
    }

    // Muvaffaqiyatli javob
    res.status(200).json({ message: "Savollar muvaffaqiyatli saqlandi!" });
  } catch (error) {
    // Xato holati
    res.status(500).json({ message: error.message });
  }
};

// Express routerga ulash uchun eksport
module.exports = { saveQuestions };
