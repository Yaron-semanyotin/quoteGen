const Product = require('../models/products');

const productsCtrl = {
  listPage: (req, res) => {
    const ownerId = req.session.userId;

    Product.find({ ownerId })
      .sort({ createdAt: -1 })
      .lean()
      .then((products) => {
        return res.render('products/index', {
          title: 'המוצרים שלי',
          products,
        });
      })
      .catch((err) => res.status(500).send(err.message));
  },

  newPage: (req, res) => {
    return res.render('products/new', { title: 'הוספת מוצר' });
  },

  create: (req, res) => {
    const ownerId = req.session.userId;
    let { name, price, unit } = req.body;

    name = String(name || '').trim();
    unit = String(unit || '').trim();

    if (!name || price === undefined || price === '') {
      return res.status(400).render('products/new', {
        title: 'הוספת מוצר',
        error: 'חובה למלא שם ומחיר',
      });
    }

    price = Number(price);
    if (Number.isNaN(price) || price < 0) {
      return res.status(400).render('products/new', {
        title: 'הוספת מוצר',
        error: 'מחיר חייב להיות מספר חיובי',
      });
    }

    Product.create({ ownerId, name, price, unit: unit || 'יחידה' })
      .then(() => res.redirect('/products'))
      .catch((err) => res.status(500).send(err.message));
  },

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
      { name, price, unit: unit || 'יחידה' }
    )
      .then(() => res.redirect('/products'))
      .catch((err) => res.status(500).send(err.message));
  },

  remove: (req, res) => {
    const ownerId = req.session.userId;
    const id = req.params.id;

    Product.deleteOne({ _id: id, ownerId })
      .then(() => res.redirect('/products'))
      .catch((err) => res.status(500).send(err.message));
  },

  search: (req, res) => {
    const ownerId = req.session.userId;
    const q = String(req.query.q || '').trim();

    if (!q) return res.json([]);

    Product.find({
      ownerId,
      name: { $regex: q, $options: 'i' },
    })
      .select({ name: 1, price: 1, unit: 1 })
      .limit(10)
      .lean()
      .then((rows) => res.json(rows))
      .catch((err) => res.status(500).json({ message: err.message }));
  },
};

module.exports = productsCtrl;
