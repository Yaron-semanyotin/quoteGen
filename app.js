require('dotenv').config();
const express = require('express');
const app = express();

const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./api/v1/routes/auth');
const productsRouters = require('./api/v1/routes/products');
const quotesRoutes = require('./api/v1/routes/quotes');

const requireAuth = require('./api/v1/middlewares/requireAuth');

const session = require('express-session');
const MongoStore = require('connect-mongo').default;

const hbs = require('express-handlebars');

app.set('views', './api/v1/views');

app.engine(
  'handlebars',
  hbs.engine({
    layoutsDir: './api/v1/views/layouts',
    partialsDir: './api/v1/views/partials',
helpers: {
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

  eq: (a, b) => String(a) === String(b),

  pad4: (n) => String(Number(n) || 0).padStart(4, '0'),

  hardBreakEvery: (text, len) => {
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

app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

app.use(cors());
app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    },
  })
);

app.use((req, res, next) => {
  res.locals.isLoggedIn = !!req.session.userId;
  res.locals.userEmail = req.session.email;
  next();
});

// ✅ דף הבית עכשיו הוא Quotes
app.get('/', (req, res) => {
  if (!req.session?.userId) return res.redirect('/auth/login');
  return res.redirect('/quotes');
});

// Routes
app.use('/auth', authRoutes);
app.use('/products', productsRouters);
app.use('/quotes', quotesRoutes);

// ✅ אין יותר /dashboard

module.exports = app;