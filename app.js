// ברמת האפליקציה app.js

require('dotenv').config(); // .env טעינת משתני סביבה מקובץ
const express = require('express'); // כדי לבנות שרת express ייבוא ספריית
const app = express(); // app ב  express שומר את הפונקציה של

const cors = require('cors'); // cors ייבוא ספריית
const morgan = require('morgan'); // morgan ייבוא ספריית

// routes חיבורי
const authRoutes = require('./api/v1/routes/auth');
const productsRouters = require('./api/v1/routes/products');
const quotesRoutes = require('./api/v1/routes/quotes');

// middleware
// const requireAuth = require('./api/v1/middlewares/requireAuth');

// session חיבור בעזרת
const session = require('express-session'); //בצד השרת sesiion בדפדפן ושומר cookie יוצר
const MongoStore = require('connect-mongo').default; // ככה המשתמש נשאר מחובר גם אחרי שנעשה ריסטרט לשרת mongo בזיכרון שנמחק זה שומר אותו ב session במקום לשמור

const hbs = require('express-handlebars'); // handlebars ייבוא ספריית

app.set('views', './api/v1/views'); // handlebars קביעת תיקיות שהרינדור ידע איפה לחפש את הנתיבים ל

app.engine( // helpers + handlebars של engine הגדרת
  'handlebars',
  hbs.engine({
    layoutsDir: './api/v1/views/layouts',
    partialsDir: './api/v1/views/partials',
helpers: { // handlebars הוא משהו שאני יכול לקרוא בתבניות helper כל
  json: (context) => JSON.stringify(context),

formatMoney: (n) => {
  const num = Number(n) || 0;
  return `${num.toFixed(2)} ₪`;
},

  calcLineTotal: (qty, price) => {
    const q = Number(qty) || 0;
    const p = Number(price) || 0;
    return q * p;
  },

  eq: (a, b) => String(a) === String(b), // משמש לבחירת תבניות

  pad4: (n) => String(Number(n) || 0).padStart(4, '0'),

  hardBreakEvery: (text, len) => { // pdf כל מספר תווים מבצע הורדת שורה כדי למנוע שורה ארוכות שישברו את ה
    if (!text) return '';
    const size = Number(len) || 20;

    let result = '';
    for (let i = 0; i < text.length; i += size) {
      result += text.slice(i, i + size) + '<br>';
    }

    return result;
  },
}
  })
);

app.set('view engine', 'handlebars');

app.use(express.static('public')); // קבציים ציבוריים ליצירת קבצים סטטיים
app.use('/uploads', express.static('public/uploads'));

// middlewares כלליים כל בקשה תעבור דרך פה
app.use(cors());
app.use(morgan('dev'));

app.use(express.json()); // json מאפשר לשרת להבין בקשות שמגיעות כ
app.use(express.urlencoded({ extended: true })); // html מאפשר לשרת לקרוא נתונים שמגיעים מטפסים של

app.use(
  session({ // mongostore עם session
    secret: process.env.SESSION_SECRET, // cookie session מפתח להצפנת חתימת
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }), //  נשמר session איםה ה
    cookie: {
      httpOnly: true, // cookie שדרך הדפדפן לא יוכלו לגשת ל
      sameSite: 'lax',
      secure: false,
    },
  })
);

app.use((req, res, next) => { // לדעת אם המשתמש מחובר handlebars מאפשר ל views משתנים גלובליים ל
  res.locals.isLoggedIn = !!req.session.userId;
  res.locals.userEmail = req.session.email;
  next();
});

// לדף הראשי route
app.get('/', (req, res) => {
  if (!req.session?.userId) return res.redirect('/auth/login');
  return res.redirect('/quotes');
});

// routes חיבור ה
app.use('/auth', authRoutes);
app.use('/products', productsRouters);
app.use('/quotes', quotesRoutes);

// שאוכל להשתמש בו במקומות אחרים app.js ייצוא קובץ
module.exports = app;