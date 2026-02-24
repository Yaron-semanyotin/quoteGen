// api/v1/models products.js

const mongoose = require('mongoose'); // ייבוא ספריית מונגוס

const productSchema = new mongoose.Schema( // יצירת סכימה
  {
    // מחייב שיהיה בעלים למוצר require: true , users אומר זה מצביע למסמכים במודל ref : users , מזהה ייחודי של משתמש במונגו objectId  שדה שמונע דליפ נתונים בין משתמשים
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, default: '1', trim: true },
  },
  { timestamps: true }
);

// חיפוש / autocomplete לפי שם בתוך בעלים
productSchema.index({ ownerId: 1, name: 1 });

// ייצוא של הסכימה
module.exports = mongoose.model('products', productSchema);
