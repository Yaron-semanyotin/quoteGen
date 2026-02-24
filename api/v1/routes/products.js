// api/v1/routes products.js

const router = require('express').Router(); // יצירת ראוטר
const requireAuth = require('../middlewares/requireAuth'); // כל פעולות המוצרים דורשות משתמש מחובר
const productsCtrl = require('../controllers/products'); // ייבוא הקונטרולר של המוצרים
// נקודת קצה לחיפוש מוצרים עבוד המשתמש
router.get('/search', requireAuth, productsCtrl.search);
// מציג רשימת מוצרים של המשתמש
router.get('/', requireAuth, productsCtrl.listPage);
// מציג טופס ליצירת מוצר חדש
router.get('/new', requireAuth, productsCtrl.newPage);
// יוצר מוצר חדש עבוד המשתמש המחובר לאחר בדיקות
router.post('/', requireAuth, productsCtrl.create);
// מציג טופס עריכת מוצר לפי ID
router.get('/:id/edit', requireAuth, productsCtrl.editPage);
// מעדכן מוצר קיים של המשתמש
router.post('/:id', requireAuth, productsCtrl.update);
//  id מוחק מוצר לפי
router.post('/:id/delete', requireAuth, productsCtrl.remove);

module.exports = router; // ייצוא הראוטר
