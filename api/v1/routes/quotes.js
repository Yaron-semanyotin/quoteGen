// api/v1/routes quotes.js

const router = require('express').Router(); // חדש router ויוצר אובייקט express ייבוא ספריית
const requireAuth = require('../middlewares/requireAuth'); // quotes שרק משתמש שמחובר יכול לגשת ל middleware ייבוא ה
const quotesCtrl = require('../controllers/quotes'); // quotes של controller ייבוא ה


// ניתובים לנקודות קצה
router.get('/', requireAuth, quotesCtrl.listPage); // כניסה לדף הצעות המחיר
router.get('/new', requireAuth,quotesCtrl.newPage);  // כניסה לדף יצירת טופס
router.post('/',requireAuth,quotesCtrl.create); // יצירת טופס

router.get('/:id/edit', requireAuth,quotesCtrl.editPage); // עריכה טופס
router.post('/:id',requireAuth,quotesCtrl.update); // עדכון טופס

router.get('/:id/pdf', requireAuth, quotesCtrl.downloadPdf); // הורדה

router.post('/:id/delete', requireAuth, quotesCtrl.remove); // הסרה


module.exports = router; // ייצוא של הנתיבים