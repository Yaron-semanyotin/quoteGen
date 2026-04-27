const router = require('express').Router();
const requireAuth = require('../middlewares/requireAuth');
const productsCtrl = require('../controllers/products');

// חשוב: חייב להיות לפני /:id/edit
router.get('/all', requireAuth, productsCtrl.all);

// נשאר כגיבוי אם תרצה להשתמש בעתיד
router.get('/search', requireAuth, productsCtrl.search);

router.get('/', requireAuth, productsCtrl.listPage);
router.get('/new', requireAuth, productsCtrl.newPage);
router.post('/', requireAuth, productsCtrl.create);

router.get('/:id/edit', requireAuth, productsCtrl.editPage);
router.post('/:id', requireAuth, productsCtrl.update);
router.post('/:id/delete', requireAuth, productsCtrl.remove);

module.exports = router;