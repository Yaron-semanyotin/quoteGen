const bcrypt = require('bcrypt');
const User = require('../models/users');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB מתאים יותר ל-Render חינמי
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('רק קבצי תמונה מותרים'));
    }
    cb(null, true);
  },
});

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function uploadLogoToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'pdfproject/logos',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

const usersObj = {
  showLogin: (req, res) => {
    return res.render('auth/login', {
      title: 'התחברות',
      layout: 'auth',
    });
  },

  showRegister: (req, res) => {
    return res.render('auth/register', {
      title: 'הרשמה',
      layout: 'auth',
    });
  },

  login: async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || '');

      if (!email || !password) {
        return res.status(400).render('auth/login', {
          title: 'התחברות',
          layout: 'auth',
          error: 'חובה למלא אימייל וסיסמה',
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).render('auth/login', {
          title: 'התחברות',
          layout: 'auth',
          error: 'אימייל או סיסמה לא נכונים',
        });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);

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
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  register: async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || '');
      const confirmPassword = String(req.body.confirmPassword || '');

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

      if (confirmPassword !== password) {
        return res.status(400).render('auth/register', {
          title: 'הרשמה',
          layout: 'auth',
          error: 'אימות סיסמה לא תואם לסיסמה',
        });
      }

      const exists = await User.findOne({ email });

      if (exists) {
        return res.status(409).render('auth/register', {
          title: 'הרשמה',
          layout: 'auth',
          error: 'האימייל כבר קיים במערכת',
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await User.create({
        email,
        passwordHash,
      });

      return res.redirect('/auth/login');
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  logout: (req, res) => {
    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  },

  settingsPage: async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await User.findById(userId).lean();

      if (!user) {
        return res.status(401).send('User not found');
      }

      return res.render('settings', {
        title: 'הגדרות עסק',
        user,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  updateSettings: (req, res) => {
    upload.single('logo')(req, res, async (err) => {
      const userId = req.session.userId;

      if (err) {
        const user = await User.findById(userId).lean();

        let msg = 'שגיאה בהעלאת קובץ';

        if (err.code === 'LIMIT_FILE_SIZE') {
          msg = 'הלוגו גדול מדי. נסה תמונה עד 3MB.';
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
        const currentUser = await User.findById(userId).lean();

        if (!currentUser) {
          return res.status(401).send('User not found');
        }

        const update = {
          businessName: String(req.body.businessName || '').trim(),
          slogan: String(req.body.slogan || '').trim(),
          phone: String(req.body.phone || '').trim(),
          themeColor: String(req.body.themeColor || '#1f2937').trim(),
        };

        if (req.file) {
          if (currentUser.logoPublicId) {
            try {
              await cloudinary.uploader.destroy(currentUser.logoPublicId, {
                resource_type: 'image',
              });
            } catch (e) {
              console.warn('Cloudinary destroy failed:', e?.message || e);
            }
          }

          const uploaded = await uploadLogoToCloudinary(req.file.buffer);

          update.logoPath = uploaded.secure_url;
          update.logoPublicId = uploaded.public_id;
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