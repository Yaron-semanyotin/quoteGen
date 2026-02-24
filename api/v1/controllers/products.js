// api/v1/controllers product.js

const Product = require('../models/products'); // ייבוא של הסכימה

const productsCtrl = { // אובייקט שמחזיק את הפונקציות
  // הצגת רשימת מוצרים
  listPage: (req, res) => {
    const ownerId = req.session.userId; // (req.session.userId = user._id.toString()) login לוקח את המשתמש המחובר שמגיע מה

    Product.find({ ownerId }) // מחפש מוצרים רק של המשתמש הנל
      .sort({ createdAt: -1 }) // ממיין אותם מהחדש לישן
      .lean() // מחזיר אובייקטים רגילים במקום מסמכי מונוס כבדים זה יותר יעיל ומהיר כשאתה רק מציג מידע
      .then((products) => {
        return res.render('products/index', { // מציג את דף המוצרים של המשתמש
          title: 'המוצרים שלי',
          products,
        });
      })
      .catch((err) => res.status(500).send(err.message));
  },
  // הצגת טופס יצירת מוצר
  // ומציג דף יצירת מוצר חדש products ל post הטופס שולח
  newPage: (req, res) => {
    return res.render('products/new', { title: 'הוספת מוצר' });
  },

  // post יצירת מוצר חדש
  create: (req, res) => {
    const ownerId = req.session.userId;
    let { name, price, unit } = req.body; // שם מחיר ויחידה req.body פרטים שמגיעי מה
    // ניקוי קלט כדי למנוי נאלים ורווחים מיותרים
    name = String(name || '').trim();
    unit = String(unit || '').trim();

    // אם חסר אחד מהתאים מחזיר הודעת שגיאה
    if (!name || price === undefined || price === '') {
      return res.status(400).render('products/new', {
        title: 'הוספת מוצר',
        error: 'חובה למלא שם ומחיר',
      });
    }
    // המרה למספר ובדיקה שהמספר חיובי או הוא שלילי הוא מחזיר מספר חיובי
    price = Number(price);
    if (Number.isNaN(price) || price < 0) {
      return res.status(400).render('products/new', {
        title: 'הוספת מוצר',
        error: 'מחיר חייב להיות מספר חיובי',
      });
    }
    // אם יש יחידה ריקה אז משלים ל1
    Product.create({ ownerId, name, price, unit: unit || '1' })
      .then(() => res.redirect('/products')) // יוצר מוצר חדש למשתמש המחובר
      .catch((err) => res.status(500).send(err.message));
  },
  //  הצגת דף עריכת מוצר של המשתמש המחובר
  editPage: (req, res) => {
    const ownerId = req.session.userId;
    const id = req.params.id;

    Product.findOne({ _id: id, ownerId })
      .lean()
      .then((product) => {
        if (!product) return res.status(404).send('לא נמצא מוצר');
        return res.render('products/edit', { title: 'עריכת מוצר', product });
      })
      .catch((err) => res.status(500).send(err.message));
  },
  // מעדכן מוצר קיים של המשתמש המחובר
  update: (req, res) => {
    const ownerId = req.session.userId;
    const id = req.params.id;
    let { name, price, unit } = req.body;

    name = String(name || '').trim();
    unit = String(unit || '').trim();

    if (!name || price === undefined || price === '') {
      return res.status(400).render('products/edit', {
        title: 'עריכת מוצר',
        error: 'חובה למלא שם ומחיר',
        product: { _id: id, name, price, unit },
      });
    }

    price = Number(price);
    if (Number.isNaN(price) || price < 0) {
      return res.status(400).render('products/edit', {
        title: 'עריכת מוצר',
        error: 'מחיר חייב להיות מספר חיובי',
        product: { _id: id, name, price, unit },
      });
    }

    Product.updateOne(
      { _id: id, ownerId },
      { name, price, unit: unit || '1' }
    )
      .then(() => res.redirect('/products'))
      .catch((err) => res.status(500).send(err.message));
  },
  // מחיקת מוצר של המשתמש המחובר
  remove: (req, res) => {
    const ownerId = req.session.userId;
    const id = req.params.id;

    Product.deleteOne({ _id: id, ownerId })
      .then(() => res.redirect('/products'))
      .catch((err) => res.status(500).send(err.message));
  },
  // חיפוש של השלמה אוטומטית
  search: (req, res) => {
    const ownerId = req.session.userId;
    const q = String(req.query.q || '').trim(); // (fetch(`/products/search?q = ${encodeURIComponent(q)})`) quote-editor.js מגיע מהקובץ q ה

    if (!q) return res.json([]);

    Product.find({
      ownerId,
      name: { $regex: q, $options: 'i' },
    })
      .select({ name: 1, price: 1, unit: 1 })
      .limit(10) // מחזיר עד 10 תוצאות
      .lean()
      .then((rows) => res.json(rows))
      .catch((err) => res.status(500).json({ message: err.message }));
  },
};

module.exports = productsCtrl; // ייצוא של נקונטרולר
