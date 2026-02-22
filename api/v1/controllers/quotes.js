// api/v1/controllers/quotes.js
const Quote = require('../models/quotes');
const puppeteer = require('puppeteer');
const User = require('../models/users');

// ======================
// Helpers
// ======================
function parseItems(itemsJson) {
  try {
    const items = JSON.parse(itemsJson || '[]');
    return Array.isArray(items) ? items : [];
  } catch (err) {
    return [];
  }
}

function sanitizeFilename(name) {
  const s = String(name || '').trim();
  if (!s) return 'quote';

  return s
    .replace(/[\\\/:*?"<>|]+/g, '-') // תווים אסורים
    .replace(/\s+/g, ' ')           // רווחים כפולים
    .slice(0, 80)
    .trim();
}

// ✅ חשוב: header רגיל חייב להיות ASCII כדי לא להפיל את Node
function toAsciiFallback(name) {
  const s = String(name || '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return s ? s.slice(0, 80) : 'quote';
}

function pad4(n) {
  return String(Number(n) || 0).padStart(4, '0');
}

function resolvePdfView(templateKey) {
  switch (templateKey) {
    case 'sandbox':
      return 'quotes/pdf-sandbox';
    case 'modern':
      return 'quotes/pdf-modern';
    default:
      // ✅ חשוב: אם יש הצעות ישנות שנשמרו classic/clean — לא נשבור
      return 'quotes/pdf-sandbox';
  }
}

// ✅ “מזריק” מה-Settings של המשתמש לתוך quote (לתצוגה/הדפסה)
function applyUserSettingsToQuote(quote, user) {
  if (!quote) return quote;

  quote.businessName = user?.businessName ?? quote.businessName ?? '';
  quote.slogan = user?.slogan ?? quote.slogan ?? '';
  quote.phone = user?.phone ?? quote.phone ?? '';
  quote.themeColor = user?.themeColor ?? quote.themeColor ?? '#1f2937';

  // אצלך ב-User זה logoPath, וב-Quote/Template זה logoUrl
  quote.logoUrl = user?.logoPath ?? quote.logoUrl ?? '';

  // fallback
  quote.items = Array.isArray(quote.items) ? quote.items : [];
  quote.templateKey = quote.templateKey || 'classic';

  return quote;
}

// ======================
// Controller
// ======================
const quotesCtrl = {
  listPage: (req, res) => {
    const ownerId = req.session.userId;

    Quote.find({ ownerId })
      .sort({ createdAt: -1 })
      .lean()
      .then((quotes) => {
        res.render('quotes/index', { title: 'הצעת מחיר', quotes });
      })
      .catch((err) => res.status(500).send(err.message));
  },

  newPage: async (req, res) => {
    const ownerId = req.session.userId;
    const user = await User.findById(ownerId).lean();

    res.render('quotes/editor', {
      title: 'יצירת הצעת מחיר',
      quote: {
        businessName: user?.businessName || '',
        slogan: user?.slogan || '',
        phone: user?.phone || '',
        title: 'הצעת מחיר',
        quoteDate: '',
        themeColor: user?.themeColor || '#1f2937',
        logoUrl: user?.logoPath || '',
        items: [],
        templateKey: 'sandbox',
        status: 'draft',
      },
      isEdit: false,
    });
  },

  create: async (req, res) => {
    const ownerId = req.session.userId;

    // ✅ לא מקבלים logoUrl / slogan / phone מהטופס בכלל
    const { businessName, title, quoteDate, themeColor, itemsJson, action, templateKey } = req.body;
    const items = parseItems(itemsJson);

    try {
      const user = await User.findById(ownerId);
      if (!user) return res.status(401).send('User not found');

      const quoteNumber = user.nextQuoteNumber;
      user.nextQuoteNumber += 1;
      await user.save();

      const q = await Quote.create({
        ownerId,
        quoteNumber,

        // אפשר לתת למשתמש לשנות businessName בתוך הצעת מחיר אם תרצה,
        // אבל אם אתה רוצה שזה יהיה תמיד מה-Settings, פשוט תשים user.businessName
        businessName: businessName || user.businessName || '',

        // ✅ תמיד מה-Settings:
        slogan: user.slogan || '',
        phone: user.phone || '',
        themeColor: themeColor || user.themeColor || '#1f2937',
        logoUrl: user.logoPath || '',

        title: title || 'הצעת מחיר',
        quoteDate: quoteDate || '',
        items,
        templateKey: templateKey || 'classic',
        status: 'draft',
      });

      if (action === 'saveAndPdf') {
        return res.redirect(`/quotes/${q._id}/pdf`);
      }
      return res.redirect(`/quotes/${q._id}/edit`);
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  editPage: async (req, res) => {
    const ownerId = req.session.userId;
    const id = req.params.id;

    try {
      const [quote, user] = await Promise.all([
        Quote.findOne({ _id: id, ownerId }).lean(),
        User.findById(ownerId).lean(),
      ]);

      if (!quote) return res.status(404).send('לא נמצאה הצעת מחיר');

      // ✅ מזריקים נתוני Settings לתצוגה
      applyUserSettingsToQuote(quote, user);

      return res.render('quotes/editor', {
        title: 'עריכת הצעת מחיר',
        quote,
        isEdit: true,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  update: async (req, res) => {
    const ownerId = req.session.userId;
    const id = req.params.id;

    // ✅ לא מקבלים logoUrl / slogan / phone מהטופס בכלל
    const { businessName, title, quoteDate, themeColor, itemsJson, action, templateKey } = req.body;
    const items = parseItems(itemsJson);

    try {
      const user = await User.findById(ownerId).lean();
      if (!user) return res.status(401).send('User not found');

      await Quote.updateOne(
        { _id: id, ownerId },
        {
          businessName: businessName || '',

          // ✅ תמיד מה-Settings:
          slogan: user.slogan || '',
          phone: user.phone || '',
          themeColor: themeColor || user.themeColor || '#1f2937',
          logoUrl: user.logoPath || '',

          title: title || 'הצעת מחיר',
          quoteDate: quoteDate || '',
          items,
          templateKey: templateKey || 'classic',
          status: 'draft',
        }
      );

      if (action === 'saveAndPdf') {
        return res.redirect(`/quotes/${id}/pdf`);
      }
      return res.redirect(`/quotes/${id}/edit`);
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  downloadPdf: async (req, res) => {
    const ownerId = req.session.userId;
    const id = req.params.id;

    try {
      const [quote, user] = await Promise.all([
        Quote.findOne({ _id: id, ownerId }).lean(),
        User.findById(ownerId).lean(),
      ]);

      if (!quote) return res.status(404).send('Quote not found');

      // ✅ תמיד מה-Settings (לוגו/סלוגן/טלפון/צבע)
      applyUserSettingsToQuote(quote, user);

      const total = (quote.items || []).reduce(
        (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
        0
      );

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const viewName = resolvePdfView(quote.templateKey);

      const html = await new Promise((resolve, reject) => {
        res.render(viewName, { layout: false, quote, total, baseUrl }, (err, outHtml) => {
          if (err) return reject(err);
          resolve(outHtml);
        });
      });

      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] });
      await page.emulateMediaType('screen');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
      });

      await browser.close();

      const safeTitle = sanitizeFilename(quote.title);
      const num = quote.quoteNumber ? `#${pad4(quote.quoteNumber)}-` : '';
      const fileBase = `${num}${safeTitle}`;
      const asciiName = toAsciiFallback(fileBase);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${encodeURIComponent(fileBase)}.pdf`
      );

      return res.send(pdfBuffer);
    } catch (err) {
      console.error(err);
      return res.status(500).send(err.message);
    }
  },

  previewPdfHtml: async (req, res) => {
    const ownerId = req.session.userId;
    const id = req.params.id;

    try {
      const [quote, user] = await Promise.all([
        Quote.findOne({ _id: id, ownerId }).lean(),
        User.findById(ownerId).lean(),
      ]);

      if (!quote) return res.status(404).send('Quote not found');

      // ✅ תמיד מה-Settings
      applyUserSettingsToQuote(quote, user);

      const total = (quote.items || []).reduce(
        (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
        0
      );

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const viewName = resolvePdfView(quote.templateKey);

      return res.render(viewName, { layout: false, quote, total, baseUrl });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  remove: async (req, res) => {
    const ownerId = req.session.userId;
    const id = req.params.id;

    try {
      await Quote.deleteOne({ _id: id, ownerId });
      return res.redirect('/quotes');
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
};

module.exports = quotesCtrl;