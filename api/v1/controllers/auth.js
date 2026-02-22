const bcrypt = require('bcrypt');
const User = require('../models/users');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `logo-${req.session.userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 }, // ✅ 6MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('רק קבצי תמונה מותרים'));
    }
    cb(null, true);
  },
});

function normalizeEmail(email) {
  return String(email || '').trim();
}
function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const usersObj = {
  showLogin: (req, res) => {
    return res.render('auth/login', { title: 'התחברות', layout: 'auth' });
  },

  showRegister: (req, res) => {
    return res.render('auth/register', { title: 'הרשמה', layout: 'auth' });
  },

  login: (req, res) => {
    const emailRaw = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!emailRaw || !password) {
      return res.status(400).render('auth/login', {
        title: 'התחברות',
        layout: 'auth',
        error: 'חובה למלא אימייל וסיסמה',
      });
    }

    // ✅ מחפש אימייל בלי תלות באותיות גדולות/קטנות + מתעלם מרווחים בקצוות
    const emailRegex = new RegExp(`^${escapeRegex(emailRaw)}$`, 'i');

    User.findOne({ email: { $regex: emailRegex } })
      .then((user) => {
        if (!user) {
          return res.status(401).render('auth/login', {
            title: 'התחברות',
            layout: 'auth',
            error: 'אימייל או סיסמה לא נכונים',
          });
        }

        return bcrypt.compare(password, user.passwordHash).then((ok) => {
          if (!ok) {
            return res.status(401).render('auth/login', {
              title: 'התחברות',
              layout: 'auth',
              error: 'אימייל או סיסמה לא נכונים',
            });
          }

          req.session.userId = user._id.toString();
          req.session.email = user.email;
          return res.redirect('/quotes');
        });
      })
      .catch((err) => res.status(500).send(err.message));
  },

  register: (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');
    const businessName = String(req.body.businessName || '').trim();

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

    User.findOne({ email })
      .then((user) => {
        if (user) {
          return res.status(409).render('auth/register', {
            title: 'הרשמה',
            layout: 'auth',
            error: 'האימייל כבר קיים במערכת',
          });
        }

        return bcrypt.hash(password, 10).then((passwordHash) => {
          return User.create({ email, passwordHash, businessName });
        });
      })
      .then((createdUser) => {
        if (!createdUser) return;
        return res.redirect('/auth/login');
      })
      .catch((err) => {
        return res.status(500).send(err.message);
      });
  },

  logout: (req, res) => {
    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  },

  settingsPage: async (req, res) => {
    const userId = req.session.userId;
    const user = await User.findById(userId).lean();
    return res.render('settings', { title: 'הגדרות עסק', user });
  },

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
        // ✅ חדש: slogan + phone
        const { businessName, themeColor, slogan, phone } = req.body;

        const update = {
          businessName: businessName || '',
          themeColor: themeColor || '#1f2937',

          // ✅ אופציונלי
          slogan: slogan || '',
          phone: phone || '',
        };

        if (req.file) {
          update.logoPath = `/uploads/${req.file.filename}`;
        }

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