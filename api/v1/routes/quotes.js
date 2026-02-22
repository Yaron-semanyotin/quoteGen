const router = require('express').Router();
const requireAuth = require('../middlewares/requireAuth');
const quotesCtrl = require('../controllers/quotes');

router.get('/', requireAuth, quotesCtrl.listPage);
router.get('/new', requireAuth,quotesCtrl.newPage);
router.post('/',requireAuth,quotesCtrl.create);

router.get('/:id/edit', requireAuth,quotesCtrl.editPage);
router.post('/:id',requireAuth,quotesCtrl.update);

router.get('/:id/pdf', requireAuth, quotesCtrl.downloadPdf);

router.post('/:id/delete', requireAuth, quotesCtrl.remove);


module.exports = router;