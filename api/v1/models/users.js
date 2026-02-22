const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },

    businessName: { type: String, default: '' },

    // ✅ חדש
slogan: { type: String, default: '' },
phone: { type: String, default: '' },

    nextQuoteNumber: { type: Number, default: 1 },
    logoPath: { type: String, default: '' },
    themeColor: { type: String, default: '#1f2937' },

    // ❌ מיותר אצלך (אתה משתמש ב-logoPath) – מומלץ למחוק מהמודל אם לא בשימוש
    // logoUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('users', userSchema);