const { DataTypes } = require('sequelize');
const sequelize = require('../../postgres/db'); // Sequelize konfiguratsiyasi

const Question = sequelize.define('Question', {
  questionText: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  options: {
    type: DataTypes.JSONB, // Variantlarni JSONB sifatida saqlaymiz
    allowNull: false,
  },
}, {
  tableName: 'questions',
  timestamps: true, // createdAt va updatedAt maydonlari qo‘shiladi
});

module.exports = Question;