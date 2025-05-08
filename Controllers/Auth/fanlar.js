const { supabase } = require("../../config/supabaseClient");

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

const getQuestionsBySubject = async (req, res) => {
  try {
    // 1. Frontenddan kelgan subject ID ni olish
    const { id } = req.params;
    // console.log("Kelgan subject ID:", id);

    // 2. Agar ID kelmagan bo'lsa, xato qaytarish
    if (!id) {
      return res.status(400).json({ error: "subjectId talab qilinadi!" });
    }

    // 3. Questions jadvalidan savollarni olish
    // subject_id ga mos keladigan savollar va ularning faqat id va question_text ni olamiz
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, question_text, created_at") // question_text jadvalda shunday nomlangan
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

    // 6. Har bir savol uchun options jadvalidan variantlarni olish
    for (let question of questions) {
      const { data: options, error: optionsError } = await supabase
        .from("options")
        .select("id, option_text, is_correct") // option_text va is_correct ni olamiz
        .eq("question_id", question.id); // question.id orqali variantlarni filtrlaymiz

      // 7. Agar variantlarni olishda xatolik bo'lsa, xato qaytarish
      if (optionsError) {
        // console.error("Variantlarni olishda xatolik:", optionsError);
        return res.status(500).json({ error: "Variantlarni olishda xatolik!" });
      }

      // 8. Savol obyektiga variantlarni qo'shish
      question.options = options || []; // Agar variantlar bo'lmasa bo'sh array
    }

    // 9. Natijani frontendga yuborish
  
    return res.status(200).json(questions);
    
  } catch (err) {
    // 10. Umumiy xatolik bo'lsa, server xatosi qaytarish
    // console.error("Server xatosi:", err);
    return res.status(500).json({ error: "Serverda xatolik yuz berdi!" });
  }
};

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

    for (const answer of answers) {
      const { questionId, variantId } = answer;

      // Variantning to‘g‘ri yoki noto‘g‘ri ekanligini tekshirish
      const { data: option, error: optionError } = await supabase
        .from("options")
        .select("is_correct")
        .eq("id", variantId)
        .single();

      if (optionError) {
        console.error("Variantni tekshirishda xatolik:", optionError);
        return res.status(500).json({ error: "Variantni tekshirishda xatolik!" });
      }

      if (option && option.is_correct) {
        correctCount++;
      }
    }

    const scorePercentage = ((correctCount / totalQuestions) * 100).toFixed(2);

    // **Natijalarni saqlash**
    const { error: saveError } = await supabase
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
      ]);

    if (saveError) {
      console.error("Natijani saqlashda xatolik:", saveError);
      return res.status(500).json({ error: "Natijani saqlashda xatolik!" });
    }

    return res.status(200).json({
      totalQuestions,
      correctAnswers: correctCount,
      scorePercentage: `${scorePercentage}%`,
      message: "Natija muvaffaqiyatli saqlandi!",
    });

  } catch (err) {
    // console.error("Server xatosi:", err);
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
    return res.status(400).json({ error: 'userId va subjectId kerak' });
  }

  try {
    // 1. Oxirgi natijani olish (results jadvalidan)
    const { data: result, error: resultError } = await supabase
      .from('results')
      .select('correct_answers, total_questions, score_percentage, created_at')
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (resultError || !result) {
      return res.status(404).json({ error: 'Natija topilmadi' });
    }

    // 2. Fan nomini olish
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', subjectId)
      .single();

    if (subjectError) {
      return res.status(500).json({ error: 'Fan nomini olishda xato' });
    }

    // Javob qaytarish
    res.json({
      subjectName: subject?.name || 'Nomaʼlum fan',
      resultSummary: result
    });

    
    

  } catch (err) {
    // console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
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




module.exports = { createSubject, deleteUserResult,  getUserResults, deleteQuestion, getUserResult,  getSubjects, updateSubject, getQuestionsBySubject, checkUserAnswers ,  deleteSubject,  getAdmins };
