// api/v1/models users.js

// mongoose  ייבוא ספריית
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema( // יצירת סכימה
  {
    // שומר את האימייל תמיד באותיות קטנות lowercase: true , מוריד רווחים בהתחלה ובסוף trim: true , לא יכולים להיות שני משתמשים עם אותו אימייל unique: true , אי אפשר ליצור משתמש בלי אימייל require: true , שומר מחרוזת string שדה אימייל
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // שומר סיסמה מוצפצנת
    passwordHash: { type: String, required: true },
    // שומר את שם העסק
    businessName: { type: String, default: '' },
    // שומר את הסלוגן
    slogan: { type: String, default: '' },
    // שומר את הטלפון
    phone: { type: String, default: '' },
    // ממספר את ההצעות המחיר בכל יצירת הצעה חדשה מעלה את המספר באחד
    nextQuoteNumber: { type: Number, default: 1 },
    // שומר את הנתיב ללוגו
    logoPath: { type: String, default: '' },
    // שומר את הצבע
    themeColor: { type: String, default: '#1f2937' },
  },
  // נותן פרטים של מתי נשמר ומתי התעדכן
  { timestamps: true }
);

// ייצוא הסכימה
module.exports = mongoose.model('users', userSchema);