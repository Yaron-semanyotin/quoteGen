// api/v1/routes auth.js

// /auth תחת app.js שמחובר ב authייעודי ל router יוצר
const router = require('express').Router();
// auth ייבוא הקונטרולר של
const usersObj = require('../controllers/auth');
//שדורש סשן פעיל middleware ייבוא
const requireAuth = require('../middlewares/requireAuth');

// מציג דף התחברות / הרשמה
router.get('/login', usersObj.showLogin);
router.get('/register', usersObj.showRegister);

// להתחברות ומבצע אימות סיסמה ויוצר סשן post שלחית בקשת
router.post('/login', usersObj.login);
// לסיסמה ויצירת משתמש חדש hash בודק כפילויות אימייל ו post שלחית בקשת
router.post('/register', usersObj.register);

// מוחק את הסשן ומפנה להתחברות
router.post('/logout', usersObj.logout);

// requireAuth מציג את דף הגדרות העסק רק למשתמש מחובר באמצעות
router.get('/settings', requireAuth, usersObj.settingsPage);
// שומר הגדרות עסק כולל העלאת לוגו עבור משתמש מחובר
router.post('/settings', requireAuth, usersObj.updateSettings);
// ייצוא הנתיבים
module.exports = router;

