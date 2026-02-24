// api/v1/controllers auth.js

const bcrypt = require('bcrypt'); // להצפנת סיסמאות bcrypt ייבוא ספריית
const User = require('../models/users'); // user ייבוא המודל של
const path = require('path'); // png jpg כלי של נוד לעבוד עם שמות קבצים וסיומות של
const multer = require('multer'); // של אקספרס לטיפול העלאת קבצים middleware

// כדי שיהיו נגישים כסטטיים uploads הגדרת אחסון לשמירת קבצים בתקיית
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'), // אומר לו לאיזה תיקייה לשמור
  filename: (req, file, cb) => { // קובי את שם הקובץ שנשמר
    const ext = path.extname(file.originalname || '').toLowerCase(); //  מחלץ את הסיומת מתוך שם הקובץ המקורי ומטפל באותיות גדולות
    cb(null, `logo-${req.session.userId}-${Date.now()}${ext}`);  // ייחודיות של זמן קישור למשתמש וסיומת נכונה כדי למנוע התנגשויות ולשייך למשתמש
  },
});
// מולטר מוגד עם אחסון ומגבלת גודל קובץ ל6 מב
const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
  fileFilter: (req, file, cb) => { // רץ לפני שמירה
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('רק קבצי תמונה מותרים'));
    }
    cb(null, true);
  },
});

// הלפר לניקוי אימייל כדי למנוע כפילויות ושגיאות חיפוש
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}
// הלפר שמנקה תווים מיוחדים
function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const usersObj = { // קורא להן router הוא אובייקא שמכיל את כל הפונקציות שה userobj
  // מציג דף התחברות אם המשתמש לא מחובר
  showLogin: (req, res) => {
    return res.render('auth/login', { title: 'התחברות', layout: 'auth' });
  },
  // אותו דבר גם פה רק להרשמה
  showRegister: (req, res) => {
    return res.render('auth/register', { title: 'הרשמה', layout: 'auth' });
  },
  // קורא אימייל וסיסמה מהטופס ומבצע ניקוי בסיסי לפני בדיקות
  login: (req, res) => {
    const emailRaw = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!emailRaw || !password) { // אם אימייל או סיסמה חסרים מחזירים את דף ההתחברות עם שגיאה
      return res.status(400).render('auth/login', {
        title: 'התחברות',
        layout: 'auth',
        error: 'חובה למלא אימייל וסיסמה',
      });
    }

    // מחפש אימייל בלי תלות באותיות גדולות/קטנות + מתעלם מרווחים בקצוות
    const emailRegex = new RegExp(`^${escapeRegex(emailRaw)}$`, 'i');
    // חיפוש משתמש לפי אימייל אם לא נמצא משתמש מחזירים 401
    User.findOne({ email: { $regex: emailRegex } })
      .then((user) => {
        if (!user) {
          return res.status(401).render('auth/login', {
            title: 'התחברות',
            layout: 'auth',
            error: 'אימייל או סיסמה לא נכונים',
          });
        }
        // אם לא מחזירים 401 hash אימוס סיסמה ומשווה סיסמה רגילה ל
        return bcrypt.compare(password, user.passwordHash).then((ok) => {
          if (!ok) {
            return res.status(401).render('auth/login', {
              title: 'התחברות',
              layout: 'auth',
              error: 'אימייל או סיסמה לא נכונים',
            });
          }
          // שומר אותם במונגו סטור ומחזיר קוקי לדפדפן express-session ה req.session שמים את הערכים ב
          // שלו session מעכשיו כל בקשה של המשתמש תכלול קוקי שמצביע ל
          // קיים אם כן המשתמש מחובר req.session.userId אם בודק requiteAuth
          req.session.userId = user._id.toString();
          req.session.email = user.email;
          return res.redirect('/quotes');
        });
      })
      .catch((err) => res.status(500).send(err.message));
  },

  register: (req, res) => { // הרשמה
    // בדיקת שדורה חובה מינימום אורך סיסמה והתמה להתהמת סיסמה
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');
    // const businessName = String(req.body.businessName || '').trim(); // פיצר לעתיד

    if (!email || !password) {
      return res.status(400).render('auth/register', {
        title: 'הרשמה',
        layout: 'auth',
        error: 'חובה למלא אימייל וסיסמה',
      });
    }

    if (password.length < 6) {
      return res.status(400).render('auth/register', {
        title: 'הרשמה',
        layout: 'auth',
        error: 'סיסמה חייבת להיות לפחות 6 תווים',
      });
    }

    if (confirmPassword && confirmPassword !== password) {
      return res.status(400).render('auth/register', {
        title: 'הרשמה',
        layout: 'auth',
        error: 'אימות סיסמה לא תואם לסיסמה',
      });
    }
    // בודק אם קיים משתמש אם אותו אימייל
    User.findOne({ email })
      .then((user) => {
        if (user) {
          return res.status(409).render('auth/register', {
            title: 'הרשמה',
            layout: 'auth',
            error: 'האימייל כבר קיים במערכת',
          });
        }
        // לסיסמה ושומר במסד נתונים bcrypt יצירת משתמש מבצע
        return bcrypt.hash(password, 10).then((passwordHash) => {
          return User.create({ email, passwordHash, businessName });
        });
      })
      .then((createdUser) => {
        if (!createdUser) return;
        return res.redirect('/auth/login'); // ולאחר הרשמה מכוון את המשתמש להתחבר
      })
      .catch((err) => {
        return res.status(500).send(err.message);
      });
  },
  // מהשרת מונדו סטור  ומחזיר את המתשמ לדף התחברותsession התנתקות מוחק את ה
  logout: (req, res) => {
    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  },
  // עם התוני המשתמש view settings ומרנדר את  session.userId דף ההגדרות שולף את המשתמש לפי
  settingsPage: async (req, res) => {
    const userId = req.session.userId;
    const user = await User.findById(userId).lean(); // js נותן אובייקט
    return res.render('settings', { title: 'הגדרות עסק', user });
  },
  // עדכון הגדרות השתמש
  updateSettings: (req, res) => {
    upload.single('logo')(req, res, async (err) => {
      const userId = req.session.userId;

      // אם Multer זרק שגיאה (למשל גודל קובץ)
      if (err) {
        const user = await User.findById(userId).lean();
        let msg = 'שגיאה בהעלאת קובץ';

        if (err.code === 'LIMIT_FILE_SIZE') {
          msg = 'הלוגו גדול מדי. נסה תמונה עד 6MB.';
        } else if (err.message) {
          msg = err.message;
        }

        return res.status(400).render('settings', {
          title: 'הגדרות עסק',
          user,
          error: msg,
        });
      }

      try {
        // בונה אובייקט עדכון לשדות העסק עם ברירת מחדל כדי לשמור ערכים תקינים במסד
        const { businessName, themeColor, slogan, phone } = req.body;

        const update = {
          businessName: businessName || '',
          themeColor: themeColor || '#1f2937',

          //  אופציונלי
          slogan: slogan || '',
          phone: phone || '',
        };

        if (req.file) { // נתיב ציבורי כדי שהדפדפן והפידיאפ יוכלו לטעון אותו user.logoPath אם העלו לוגו שמור ב
          update.logoPath = `/uploads/${req.file.filename}`;
        }
        // מעדכן את המשתמ המחובר ואז מפנה חזרה לדף הגדרות כדי לראות את הערכים המעודכנים
        await User.updateOne({ _id: userId }, update);
        return res.redirect('/auth/settings');
      } catch (e) {
        const user = await User.findById(userId).lean();
        return res.status(500).render('settings', {
          title: 'הגדרות עסק',
          user,
          error: 'שגיאת שרת, נסה שוב',
        });
      }
    });
  },
};

module.exports = usersObj;