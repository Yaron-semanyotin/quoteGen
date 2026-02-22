const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, default: 'יחידה', trim: true },
  },
  { timestamps: true }
);

// חיפוש / autocomplete לפי שם בתוך בעלים
productSchema.index({ ownerId: 1, name: 1 });

module.exports = mongoose.model('products', productSchema);
