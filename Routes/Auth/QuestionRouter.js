const express = require("express");
const {  saveQuestions } = require("../../Controllers/Auth/QuestionController");

const router = express.Router();

router.post("/question", saveQuestions);


module.exports = router;