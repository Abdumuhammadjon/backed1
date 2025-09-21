const { supabase } = require("../../config/supabaseClient");
const PDFDocument = require("pdfkit");
require('dotenv').config();








const getAdmins = async (req, res) => {
  try {
      const { data, error } = await supabase
      .from("users")
      .select("id, username, email, role")
      .eq("role", "admin");

    if (error) throw error;

    res.status(200).json({ success: true, admins: data });
  } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
};



// 📌 Yangi fan qo‘shish
const createSubject = async (req, res) => {
  const { name, admin } = req.body;

  if (!name || !admin) {
    return res.status(400).json({ error: "Barcha maydonlarni to‘ldiring!" });
  }

  // 1. Avval admin allaqachon biror fanga biriktirilganligini tekshiramiz
  const { data: existingAdmin, error: adminCheckError } = await supabase
    .from("subjects")
    .select("*")
    .eq("admin", admin);

  if (adminCheckError) {
    return res.status(500).json({ error: "Admin tekshirishda xatolik yuz berdi!" });
  }

  if (existingAdmin.length > 0) {
    return res.status(400).json({ error: "Bu admin allaqachon boshqa fanga biriktirilgan!" });
  }

  // 2. Fan allaqachon mavjud emasligini tekshiramiz
  const { data: existingSubjects, error: fetchError } = await supabase
    .from("subjects")
    .select("*")
    .eq("name", name);

  if (fetchError) {
    return res.status(500).json({ error: "Fan ma'lumotlarini tekshirishda xatolik!" });
  }

  if (existingSubjects.length > 0) {
    return res.status(400).json({ error: "Bu fan allaqachon yaratilgan!" });
  }

  // 3. Agar hamma shartlar bajarilsa, yangi fan qo‘shamiz
  const { data, error } = await supabase.from("subjects").insert([{ name, admin }]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ message: "Fan muvaffaqiyatli qo‘shildi!", subject: data });
};


// 📌 Fanlar ro‘yxatini olish
const getSubjects = async (req, res) => {
  try {
    const { data, error } = await supabase.from("subjects").select("*");

    if (error) {
        console.error("Fanlarni olishda xatolik:", error.message);
        return res.status(500).json({ error: "Fanlar ma'lumotlarini olishda xatolik yuz berdi!" });
      }
  
      res.status(200).json(data);
    } catch (err) {
    // console.error("Server xatosi:", err);
    res.status(500).json({ error: "Serverda ichki xatolik yuz berdi!" });
  }
};


// 📌 Fanni yangilash
const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, admin } = req.body;

  const { data, error } = await supabase
    .from("subjects")
    .update({ name, admin })
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Fan muvaffaqiyatli yangilandi!", subject: data });
};

// 📌 Fanni o‘chirish
const deleteSubject = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("subjects").delete().eq("id", id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Fan o‘chirildi!" });
};

// Tasodifiy aralashtirish uchun Fisher-Yates shuffle algoritmi
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const getQuestionsBySubject = async (req, res) => {
  try {
    // 1. Frontenddan kelgan subject ID ni olish
    const { id } = req.params;

    // 2. Agar ID kelmagan bo'lsa, xato qaytarish
    if (!id) {
      return res.status(400).json({ error: "subjectId talab qilinadi!" });
    }

    // 3. Questions jadvalidan savollarni olish
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, question_text, created_at")
      .eq("subject_id", id);

    // 4. Agar savollarni olishda xatolik bo'lsa, xato qaytarish
    if (questionsError) {
      console.error("Savollarni olishda xatolik:", questionsError);
      return res.status(500).json({ error: "Savollarni olishda xatolik!" });
    }

    // 5. Agar savollar bo'lmasa, bo'sh ro'yxat qaytarish
    if (!questions || questions.length === 0) {
      return res.status(200).json([]);
    }

    // 6. Savollarni tasodifiy tartibda aralashtirish
    const shuffledQuestions = shuffleArray([...questions]);

    // 7. Har bir savol uchun options jadvalidan variantlarni olish
    for (let question of shuffledQuestions) {
      const { data: options, error: optionsError } = await supabase
        .from("options")
        .select("id, option_text, is_correct")
        .eq("question_id", question.id);

      // 8. Agar variantlarni olishda xatolik bo'lsa, xato qaytarish
      if (optionsError) {
        console.error("Variantlarni olishda xatolik:", optionsError);
        return res.status(500).json({ error: "Variantlarni olishda xatolik!" });
      }

      // 9. Variantlarni tasodifiy tartibda aralashtirish
      question.options = shuffleArray([...options]) || [];
    }

    // 10. Natijani frontendga yuborish
    return res.status(200).json(shuffledQuestions);
  } catch (err) {
    // 11. Umumiy xatolik bo'lsa, server xatosi qaytarish
    console.error("Server xatosi:", err);
    return res.status(500).json({ error: "Serverda xatolik yuz berdi!" });
  }
};   // 3. Questions jadvalidan savollarni olish


 const checkUserAnswers = async (req, res) => {
  try {
    const { answers, userId, subjectId } = req.body;

    if (!answers || answers.length === 0) {
      return res.status(400).json({ error: "Javoblar talab qilinadi!" });
    }

    if (!userId || !subjectId) {
      return res.status(400).json({ error: "Foydalanuvchi ID va subjectId talab qilinadi!" });
    }

    let correctCount = 0;
    const totalQuestions = answers.length;
    const answersToInsert = [];

    for (const answer of answers) {
      const { questionId, variantId } = answer;

      // 1️⃣ Variantni tekshirish
      const { data: option, error: optionError } = await supabase
        .from("options")
        .select("is_correct, option_text, question_id")
        .eq("id", variantId)
        .single();

      if (optionError) {
        console.error("Variantni tekshirishda xatolik:", optionError);
        return res.status(500).json({ error: "Variantni tekshirishda xatolik!" });
      }

      // 2️⃣ Savol matnini olish
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select("question_text")
        .eq("id", questionId)
        .single();

      if (questionError) {
        console.error("Savolni olishda xatolik:", questionError);
        return res.status(500).json({ error: "Savolni olishda xatolik!" });
      }

      // 3️⃣ To‘g‘ri javobni olish
      const { data: correctOpt } = await supabase
        .from("options")
        .select("option_text")
        .eq("question_id", questionId)
        .eq("is_correct", true)
        .single();

      const isCorrect = option?.is_correct || false;
      if (isCorrect) correctCount++;

      // 4️⃣ answers massiviga qo‘shish
      answersToInsert.push({
        question_id: questionId,
        question_text: questionData?.question_text || null, // ✅ savol matni
        user_answer: option?.option_text || null,           // ✅ foydalanuvchi javobi
        correct_answer: correctOpt?.option_text || null,    // ✅ to‘g‘ri javob
        is_correct: isCorrect,
        created_at: new Date().toISOString(),
      });
    }

    const scorePercentage = ((correctCount / totalQuestions) * 100).toFixed(2);

    // 5️⃣ results jadvaliga yozish
    const { data: result, error: saveError } = await supabase
      .from("results")
      .insert([
        {
          user_id: userId,
          subject_id: subjectId,
          correct_answers: correctCount,
          total_questions: totalQuestions,
          score_percentage: scorePercentage,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id")
      .single();

    if (saveError) {
      console.error("Natijani saqlashda xatolik:", saveError);
      return res.status(500).json({ error: "Natijani saqlashda xatolik!" });
    }

    // 6️⃣ answers jadvaliga yozish
  const answersWithResult = answersToInsert.map(answer => ({
  ...answer,
  result_id: result.id, // bu yerda result.id integer
}));

console.log(answersToInsert);

    const { error: answersError } = await supabase
      .from("answers")
      .insert(answersWithResult);

    if (answersError) {
      console.error("Answerlarni saqlashda xatolik:", answersError);
      return res.status(500).json({ error: "Answerlarni saqlashda xatolik!" });
    }

    return res.status(200).json({
      totalQuestions,
      correctAnswers: correctCount,
      scorePercentage: `${scorePercentage}%`,
      message: "Natija va barcha javoblar muvaffaqiyatli saqlandi!",
    });

  } catch (err) {
    console.error("Server xatosi:", err);
    return res.status(500).json({ error: "Serverda xatolik yuz berdi!" });
  }
};



const getUserResults = async (req, res) => {
  try {
      const userId = req.params.id;
    const { subjectId } = req.query;
    // console.log('userId:', userId, 'subjectId:', subjectId);

    if (!userId) {
      return res.status(400).json({ error: "Foydalanuvchi ID majburiy!" });
    }

    // Supabase query
    let query = supabase
      .from("results")
      .select(`
        id,
        user_id,
        subject_id,
        correct_answers,
        total_questions,
        score_percentage,
        created_at,
        users:users!user_id(username)
      `)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }

    const { data: results, error } = await query;

    if (error) {
      console.error("Natijalarni olishda xatolik:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Natijalar topilmadi!" });
    }

    const formattedResults = results.map(result => ({
      resultId: result.id,
      userId: result.user_id, // <-- Bu qo'shildi
      subjectId: result.subject_id,
      correctAnswers: result.correct_answers,
      totalQuestions: result.total_questions,
      scorePercentage: `${result.score_percentage}%`,
      date: new Date(result.created_at).toLocaleString("uz-UZ"),
      username: result.users?.username || "Noma'lum",
    }));

    return res.status(200).json({
        results: formattedResults,
      totalResults: formattedResults.length,
      message: "Natijalar muvaffaqiyatli olindi!"
    });
  } catch (err) {
      // console.error("Server xatosi:", err);
      return res.status(500).json({ error: "Serverda xatolik yuz berdi!" });
    }
  };
  
  
const getUserResult = async (req, res) => {
  const { userId, subjectId } = req.query;

  if (!userId || !subjectId) {
    return res.status(400).json({ error: "userId va subjectId kerak" });
  }

  try {
    // 1. Oxirgi natija (results jadvalidan)
    const { data: result, error: resultError } = await supabase
      .from("results")
      .select("id, correct_answers, total_questions, score_percentage, created_at")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (resultError || !result) {
      return res.status(404).json({ error: "Natija topilmadi" });
    }

    // 2. Shu result.id orqali answers olish
    const { data: answers, error: answersError } = await supabase
      .from("answers")
      .select("id, question_text, user_answer, correct_answer, is_correct")
      .eq("result_id", result.id)
      .order("created_at", { ascending: true });

    if (answersError) {
      return res.status(500).json({ error: "Answers olishda xato" });
    }

    // 3. Fan nomini olish
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", subjectId)
      .single();

    if (subjectError) {
      return res.status(500).json({ error: "Fan nomini olishda xato" });
    }

    // ✅ Hammasini qaytarish
    res.json({
      subjectName: subject?.name || "Nomaʼlum fan",
      resultSummary: result,
      answers: answers || [],
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
};



const deleteQuestion = async (req, res) => {
  try {
    const questionId = req.params.id;

    // Check if question exists
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select('id')
      .eq('id', questionId)
      .single();

    if (fetchError || !question) {
      return res.status(404).json({ error: 'Savol topilmadi' });
    }

    // Delete the question
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (deleteError) {
        throw new Error(deleteError.message);
    }

    res.status(200).json({ message: 'Savol muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    // console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Savolni o\'chirishda xatolik yuz berdi' });
  }
};





// Sening berilgan funksiyang — "new" bilan to'g'riladi:
const getUserResultsPDF = async (dataCallback, endCallback) => {
  const doc = new PDFDocument();      // <-- PDFKit uchun new kerak
  doc.on('data', dataCallback);
  doc.on('end', endCallback);
  doc.fontSize(25).text('pdf yaratildi');
  doc.end();
  return doc; // ixtiyoriy: xatolarni tutish uchun foydali
};



const deleteUserResult = async (req, res) => {
  const resultId  = req.params.id;
  // console.log(resultId);

  const userId = req.user?.id; // Token orqali aniqlangan user ID

  if (!resultId) {
    return res.status(400).json({ error: 'Maʼlumot yetarli emas' });
  }

  // Avval natijani olib tekshiramiz: bu natija shu foydalanuvchigami?
  const { data: result, error: fetchError } = await supabase
    .from('results')
    .select('user_id')
    .eq('id', resultId)
    .single();

  if (fetchError || !result) {
      return res.status(404).json({ error: 'Natija topilmadi' });
    }
  
    // if (result.user_id !== userId) {
  //   return res.status(403).json({ error: 'Siz bu natijani o‘chira olmaysiz' });
  // }

  // Endi o‘chiramiz
  const { error: deleteError } = await supabase
    .from('results')
    .delete()
    .eq('id', resultId);

  if (deleteError) {
    return res.status(500).json({ error: 'O‘chirishda xatolik' });
  }

  res.status(200).json({ message: 'Natija o‘chirildi' });
};




module.exports = { createSubject, deleteUserResult, getUserResultsPDF, getUserResults, deleteQuestion, getUserResult,  getSubjects, updateSubject, getQuestionsBySubject, checkUserAnswers ,  deleteSubject,  getAdmins };


