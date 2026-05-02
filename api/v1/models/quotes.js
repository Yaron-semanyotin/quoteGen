// api/v1/models quotes.js

const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    type:  { type: String, default: 'item' },
    name:  { type: String, required: true, trim: true },
    unit:  { type: String, default: '', trim: true },
    price: { type: Number, default: 0, min: 0 },
    qty:   { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const quoteSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    quoteNumber: { type: Number, required: true },
    businessName: {type: String, default: '', trim: true},
    slogan: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    title: {type: String, default: 'הצעת מחיר', trim: true},
    quoteDate: {type: String, default: ''},
    templateKey: { type: String, enum: ['modern', 'sandbox'], default: 'sandbox' },


    themeColor: {type: String, default: '#1f2937'},
    logoUrl: {type: String, default: ''},

    items: {type: [itemSchema], default: []},

    status: { type: String, default: 'draft' }
  },
  {timestamps: true}
);

quoteSchema.index({ownerId: 1, createdAt: -1});

module.exports = mongoose.model('quotes', quoteSchema);