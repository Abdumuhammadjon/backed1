const { supabase } = require("../../config/supabaseClient");
const PDFDocument = require("pdfkit");
require('dotenv').config();

// Tasodifiy aralashtirish uchun Fisher-Yates shuffle algoritmi
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

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

const createSubject = async (req, res) => {
  const { name, admin } = req.body;
  if (!name || !admin) {
    return res.status(400).json({ error: "Barcha maydonlarni to‘ldiring!" });
  }

  // 1. Admin allaqachon fanga biriktirilganligini tekshirish
  const { data: existingAdmin, error: adminCheckError } = await supabase
    .from("subjects")
    .select("id")
    .eq("admin", admin)
    .maybeSingle();

  if (adminCheckError) {
    return res.status(500).json({ error: "Admin tekshirishda xatolik" });
  }
  if (existingAdmin) {
    return res.status(400).json({ error: "Bu admin allaqachon boshqa fanga biriktirilgan!" });
  }

  // 2. Fan nomi mavjudligini tekshirish
  const { data: existingSubject, error: nameCheckError } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (nameCheckError) {
    return res.status(500).json({ error: "Fan nomini tekshirishda xatolik" });
  }
  if (existingSubject) {
    return res.status(400).json({ error: "Bu fan allaqachon mavjud!" });
  }

  // 3. Yangi fan qo'shish
  const { data, error } = await supabase
    .from("subjects")
    .insert([{ name, admin }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ message: "Fan muvaffaqiyatli qo‘shildi!", subject: data });
};

const getSubjects = async (req, res) => {
  try {
    const { data, error } = await supabase.from("subjects").select("*").order("name");
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fanlarni olishda xatolik" });
  }
};

const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, admin } = req.body;

  if (!id || (!name && !admin)) {
    return res.status(400).json({ error: "Yangilash uchun ma'lumot yetarli emas" });
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (admin) updateData.admin = admin;

  const { data, error } = await supabase
    .from("subjects")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Fan topilmadi" });

  res.json({ message: "Fan yangilandi", subject: data });
};

const deleteSubject = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Fan o‘chirildi" });
};

const getQuestionsBySubject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "subjectId talab qilinadi" });

    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, question_text, created_at")
      .eq("subject_id", id);

    if (qError) throw qError;
    if (!questions?.length) return res.status(200).json([]);

    const shuffledQuestions = shuffleArray([...questions]);

    // Barcha savollar uchun bir marta variantlarni olish (optimallashtirish)
    const questionIds = shuffledQuestions.map(q => q.id);
    const { data: allOptions, error: optError } = await supabase
      .from("options")
      .select("id, option_text, is_correct, question_id")
      .in("question_id", questionIds);

    if (optError) throw optError;

    const optionsByQuestion = new Map();
    allOptions?.forEach(opt => {
      if (!optionsByQuestion.has(opt.question_id)) {
        optionsByQuestion.set(opt.question_id, []);
      }
      optionsByQuestion.get(opt.question_id).push(opt);
    });

    shuffledQuestions.forEach(question => {
      const opts = optionsByQuestion.get(question.id) || [];
      question.options = shuffleArray([...opts]);
    });

    return res.status(200).json(shuffledQuestions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Savollarni olishda xatolik" });
  }
};

const checkUserAnswers = async (req, res) => {
  try {
    const { answers, userId, subjectId } = req.body;

    if (!answers?.length) return res.status(400).json({ error: "Javoblar talab qilinadi" });
    if (!userId || !subjectId) return res.status(400).json({ error: "userId va subjectId kerak" });

    // Oldin topshirilganligini tekshirish
    const { data: existing, error: checkErr } = await supabase
      .from("results")
      .select("id")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (existing) {
      return res.status(403).json({
        error: "Bu fandan allaqachon test topshirgansiz",
        message: "Qayta ishlash taqiqlangan"
      });
    }

    const questionIds = answers.map(a => a.questionId);
    const variantIds  = answers.map(a => a.variantId);

    // Variantlar
    const { data: options, error: optErr } = await supabase
      .from("options")
      .select("id, is_correct, option_text, question_id")
      .in("id", variantIds);

    if (optErr) throw optErr;

    // Savollar
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("id, question_text")
      .in("id", questionIds);

    if (qErr) throw qErr;

    // To'g'ri javoblar
    const { data: correctOpts, error: corrErr } = await supabase
      .from("options")
      .select("question_id, option_text")
      .in("question_id", questionIds)
      .eq("is_correct", true);

    if (corrErr) throw corrErr;

    const optMap    = new Map(options.map(o => [o.id, o]));
    const qMap      = new Map(questions.map(q => [q.id, q]));
    const correctMap = new Map(correctOpts.map(c => [c.question_id, c]));

    let correctCount = 0;
    const total = answers.length;

    const answersToInsert = answers.map(ans => {
      const opt = optMap.get(ans.variantId);
      const q   = qMap.get(ans.questionId);
      const corr = correctMap.get(ans.questionId);

      const isCorrect = !!opt?.is_correct;
      if (isCorrect) correctCount++;

      return {
        question_id: ans.questionId,
        question_text: q?.question_text || null,
        user_answer: opt?.option_text || null,
        correct_answer: corr?.option_text || null,
        is_correct: isCorrect,
        created_at: new Date().toISOString(),
      };
    });

    const percentage = ((correctCount / total) * 100).toFixed(2);

    // Natijani saqlash
    const { data: result, error: resErr } = await supabase
      .from("results")
      .insert([{
        user_id: userId,
        subject_id: subjectId,
        correct_answers: correctCount,
        total_questions: total,
        score_percentage: percentage,
        created_at: new Date().toISOString(),
      }])
      .select("id")
      .single();

    if (resErr) throw resErr;

    // Javoblarni saqlash
    const answersWithResultId = answersToInsert.map(a => ({
      ...a,
      result_id: result.id
    }));

    const { error: insertErr } = await supabase
      .from("answers")
      .insert(answersWithResultId);

    if (insertErr) throw insertErr;

    return res.status(200).json({
      totalQuestions: total,
      correctAnswers: correctCount,
      scorePercentage: `${percentage}%`,
      message: "Natija saqlandi"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server xatosi" });
  }
};

const getUserResult = async (req, res) => {
  const { userId, subjectId } = req.query;
  if (!userId || !subjectId) {
    return res.status(400).json({ error: "userId va subjectId kerak" });
  }

  try {
    const { data: result, error } = await supabase
      .from("results")
      .select(`
        id,
        correct_answers,
        total_questions,
        score_percentage,
        created_at,
        answers:answers!fk_result (
          question_id,
          user_answer,
          correct_answer,
          is_correct,
          question_text
        )
      `)
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!result) return res.status(404).json({ error: "Natija topilmadi" });

    const { data: subj } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", subjectId)
      .single();

    res.json({
      subjectName: subj?.name || "Noma'lum fan",
      resultSummary: {
        id: result.id,
        correct_answers: result.correct_answers,
        total_questions: result.total_questions,
        score_percentage: result.score_percentage,
        created_at: result.created_at
      },
      answers: result.answers || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: q, error: fetchErr } = await supabase
      .from("questions")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchErr || !q) return res.status(404).json({ error: "Savol topilmadi" });

    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) throw error;

    res.json({ message: "Savol o‘chirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Savolni o‘chirishda xatolik" });
  }
};

const getUserResultsPDF = async (dataCallback, endCallback) => {
  const doc = new PDFDocument();
  doc.on("data", dataCallback);
  doc.on("end", endCallback);

  doc.fontSize(25).text("PDF yaratildi", 100, 100);
  doc.end();

  return doc;
};

const deleteUserResult = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!id) return res.status(400).json({ error: "result id kerak" });

  try {
    const { data: result, error: fetchErr } = await supabase
      .from("results")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchErr || !result) return res.status(404).json({ error: "Natija topilmadi" });

    // Agar faqat o'z natijangizni o'chira olish kerak bo'lsa kommentni oching
    // if (result.user_id !== userId) {
    //   return res.status(403).json({ error: "Bu natija sizniki emas" });
    // }

    const { error } = await supabase.from("results").delete().eq("id", id);
    if (error) throw error;

    res.json({ message: "Natija o‘chirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "O‘chirishda xatolik" });
  }
};

// Eksport
module.exports = {
  getAdmins,
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
  getQuestionsBySubject,
  checkUserAnswers,
  getUserResult,
  deleteQuestion,
  getUserResultsPDF,
  deleteUserResult
  // getUserResults — agar kerak bo'lsa, alohida funksiya sifatida qo'shishingiz mumkin
};
