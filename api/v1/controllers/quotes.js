// api/v1/controllers quotes.js

const Quote = require('../models/quotes'); // ייבוא סכימה של הצעות מחיר
const puppeteer = require('puppeteer'); // pdf והיא מחזירה html מאחורי הקלעים אני נותן chromium שמריצה puppeteer ייבוא ספריית
const User = require('../models/users'); // ייבוא של סכימה של מסתמשים

// Helpers
function parseItems(itemsJson) { // פונקציה שהופכת את המחרוזת למערך
  try {
    const items = JSON.parse(itemsJson || '[]');
    return Array.isArray(items) ? items : [];
  } catch (err) {
    return []; //   תקין מחזירים מערך ריקjson אם לא מתקבל
  }
}

function sanitizeFilename(name) { // המרת תווים אסורים לתווים שלא יוצרים בעיות
  const s = String(name || '').trim();
  if (!s) return 'quote';

  return s
    .replace(/[\\\/:*?"<>|]+/g, '-') // תווים אסורים
    .replace(/\s+/g, ' ')           // רווחים כפולים
    .slice(0, 80)
    .trim();
}

// פונקציה לניקוי והכנת מחרוזת לשימוש כשם קובץ
// ascii מחליפה תווים אסורים במערכת הקבצים ומסירה תויים שהם לא
// מנקה רווחים מיותרים ומגבילה את האורך ל80 תווים
// quote כברירת מחדל אם שם הקובץ ריק מחזיר
function toAsciiFallback(name) {
  const s = String(name || '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return s ? s.slice(0, 80) : 'quote';
}

function pad4(n) { // פונקציה שעוזרת למספר את הצעות המחיר שמה ארבעה אפסים וכל הצעה מעלה מספר באחד ככה נוח למספר את ההצעות
  return String(Number(n) || 0).padStart(4, '0');
}

//  לרנדר view פונקציה שבהתאים אליה אני בוחר איזה
function resolvePdfView(templateKey) {
  switch (templateKey) {
    case 'sandbox':
      return 'quotes/pdf-sandbox';
    case 'modern':
      return 'quotes/pdf-modern';
    default:
      return 'quotes/pdf-sandbox';
  }
}

// את הסלוגן לוגו צבע וטלפון user settings אני לוקח מה
// user גם אם בהצעת מחיר נשמר סלוגן ישן או לוגו ישן אני רוצה להראות תמיד את העדכני מה
// ככה אם המשתמש החליף לוגו אם פרטים אחרים כל קובץ חדש יצא עם הלוגו החדש
// render לפי user את הערכים מה quote אז הפונקציה מזריקה ל
function applyUserSettingsToQuote(quote, user) {
  if (!quote) return quote; // אם אין כלום מחזיר כמו שהוא

  // מזריק נתונים מהמשתמש להצעת המחיר אם חסר
  quote.businessName = user?.businessName ?? quote.businessName ?? '';
  quote.slogan = user?.slogan ?? quote.slogan ?? '';
  quote.phone = user?.phone ?? quote.phone ?? '';
  quote.themeColor = user?.themeColor ?? quote.themeColor ?? '#1f2937';
  quote.logoUrl = user?.logoPath ?? quote.logoUrl ?? '';

  quote.items = Array.isArray(quote.items) ? quote.items : []; // יהיה מערך items מוודא ש
  quote.templateKey = quote.templateKey === 'modern' ? 'modern' : 'sandbox'; // קיימים templates שימוש ב

  return quote;
}

// Controllers
const quotesCtrl = {
  listPage: (req, res) => { // לכניסה לדף הצעות המחיר get פעולת
    const ownerId = req.session.userId; // משתנה שאומר לי מי המשתמש המחובר

    Quote.find({ ownerId }) // תביא לי את כל הצעות המחיר ששייכות למשתמש הזה בלבד
      .sort({ createdAt: -1 }) // סדר אותם מהחדשות למעלה
      .lean() // מחזיר אובייקט כדי שאוכל לרנד זאת
      .then((quotes) => {
        res.render('quotes/index', { title: 'הצעת מחיר', quotes }); // ושם עושים לולאה על הצעות המחיר index.handlebars הולך לקבוץ
      })
      .catch((err) => res.status(500).send(err.message)); // error ומידה ויש שגיאה מחזירים
  },

  newPage: async (req, res) => { // מציג את עמוד יצירת הצעת המחיר
    const ownerId = req.session.userId; // משתנה שאומר לי מי המשתמש המחובר
    // שלו ומביא ממנו את ההגדרות של שם העסק טלפון לוגו סלוגן id מחפש את המשתמש לפי ה
    //  ואז תמשיך user חכה עד שיחזיר await אומר
    //  מחזיר אובייקט lean 
    const user = await User.findById(ownerId).lean();

    // שמציגה את דף יצירת הצעת מחיר חדשה get פעולת
    res.render('quotes/editor', { // ומציג בו ערכים ברירת מחדל מההגדרות העסק editor.handlebars טוען את הקובץ
      title: 'יצירת הצעת מחיר',
      quote: { // ui מתחילים עם הצעה מוכנה היא לא שמירה עדיין במסד נתונים זו טיוטה בזיכרון בשביל להציג
        businessName: user?.businessName || '', // של מחרוזת ריקה fallback בודק אם קיים שם עסק אם לא קיים מחזיר
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
      isEdit: false, // כי בקובץ יש לי תנאי שגורם לעמוד להראות כיצירה ולא עריכה כי פה אנחנו יוצרים הצעה false אנחנו
    });
  },

  // שמופעלת כשמשתמש לוחץ שמור בטופס יצירת הצעת המחיר post פעולת
  create: async (req, res) => {
    const ownerId = req.session.userId; // מי המשתמש המחובר כי כל ההצעות צריכות להיותר שייכות לבעלים

    // body וכל זה נהיה editor.handlebars בקובץ inputs נתונים שאנחנו מקבלים מה
    const { businessName, title, quoteDate, themeColor, itemsJson, action, templateKey } = req.body;
    // למערך itemsJson המרת 
    const items = parseItems(itemsJson);

    try { // מוודא שהמשתמש קיים במסדר הנתונים ומונע קריסה
      const user = await User.findById(ownerId);
      if (!user) return res.status(401).send('User not found');

      const quoteNumber = user.nextQuoteNumber; // מייצר מספר הצעת קץ כל פעם שנוצרת הצעה חדשה המונה עולה ב1
      user.nextQuoteNumber += 1;
      await user.save();

      const q = await Quote.create({ // db יוצר הצעת מחחיר חדשה ב
        ownerId,
        quoteNumber,

        businessName: businessName || user.businessName || '', // User אם המשתמש לא שינה כלום בטופס אז נשתמש בערכים מה
        slogan: user.slogan || '',
        phone: user.phone || '',
        themeColor: themeColor || user.themeColor || '#1f2937',
        logoUrl: user.logoPath || '',

        title: title || 'הצעת מחיר',
        quoteDate: quoteDate || '',
        items,
        templateKey: templateKey === 'modern' ? 'modern' : 'sandbox',
        status: 'draft',
      });

      if (action === 'saveAndPdf') { //  GET /quotes/:id/pdf route אז הולכים ל pdf אם לחצתי שמור והורד
        return res.redirect(`/quotes/${q._id}/pdf`);
      }
      return res.redirect(`/quotes/${q._id}/edit`); // כדי להמשיך לערוך GET /quotes/:id/edit אחרת הולך ל
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  // שטוענת הצעת מחיר קיימת ומציגה אותה בטופס העריכה get פעולת
  editPage: async (req, res) => {
    const ownerId = req.session.userId; // מזהה מי מחובר
    const id = req.params.id; // url מזהה ההצעה מה

    try {
      const [quote, user] = await Promise.all([ // בשביל להריץ שתי שאילתות במקביל ולא אחת אחרת השניה זה יותר מהיר מסתבר promise.all שימוש ב
        Quote.findOne({ _id: id, ownerId }).lean(), // תביא תא ההצכה רק אם היא שייכת למשתמש הזה
        User.findById(ownerId).lean(),
      ]);

      if (!quote) return res.status(404).send('לא נמצאה הצעת מחיר'); // אם ההצעה לא קיימת או לא שייכת למשתמש תחזיר

      // משלים שם עסק צבע לוגו וכו
      applyUserSettingsToQuote(quote, user);

      return res.render('quotes/editor', { // מכניס למצב עריכה 
        title: 'עריכת הצעת מחיר',
        quote,
        isEdit: true, // true בגלל זה פה אנחנו
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
  
  // של עדכון הצעת מחיר post פעולת
  update: async (req, res) => {
    const ownerId = req.session.userId;
    const id = req.params.id;


    const { businessName, title, quoteDate, themeColor, itemsJson, action, templateKey } = req.body;
    const items = parseItems(itemsJson);

    try {
      const user = await User.findById(ownerId).lean();
      if (!user) return res.status(401).send('User not found');

      await Quote.updateOne( // עדכון עם פילטר שאם ההצעה לא של המשתמש הזה אז לא יתעדכן
        { _id: id, ownerId },
        {
          businessName: businessName || '', // לוקחים שוב את הפרטים מההגדות כדי שיחזיר את הפרטים במסד נתונים
          slogan: user.slogan || '',
          phone: user.phone || '',
          themeColor: themeColor || user.themeColor || '#1f2937',
          logoUrl: user.logoPath || '',

          title: title || 'הצעת מחיר',
          quoteDate: quoteDate || '',
          items,
          templateKey: templateKey === 'modern' ? 'modern' : 'sandbox',
          status: 'draft',
        }
      );

      if (action === 'saveAndPdf') { //  GET /quotes/:id/pdf route אז הולכים ל pdf אם לחצתי שמור והורד
        return res.redirect(`/quotes/${id}/pdf`);
      }
      return res.redirect(`/quotes/${id}/edit`); // כדי להמשיך לערוך GET /quotes/:id/edit אחרת הולך ל
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
  // להורדת קובץ הצעת המחיר get פעולת
  downloadPdf: async (req, res) => {
    const ownerId = req.session.userId; // מי מחובר
    const id = req.params.id; // איזה הצעת מחיר 

    try {
      const [quote, user] = await Promise.all([ // בשביל להריץ שתי שאילתות במקביל ולא אחת אחרת השניה זה יותר מהיר מסתבר promise.all שימוש ב
        Quote.findOne({ _id: id, ownerId }).lean(),// תביא תא ההצעה רק אם היא שייכת למשתמש הזה
        User.findById(ownerId).lean(),
      ]);

      if (!quote) return res.status(404).send('Quote not found'); // אם לא נמצאה הצעה תחזיר

      // גם אם במסד נתונים נשמר לוגו או סלוגן ישן הפרטים העדכניים יכנסו לקובץ
      applyUserSettingsToQuote(quote, user);

      const total = (quote.items || []).reduce( // מחשב מחיר סה"כ
        (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
        0
      );

      const baseUrl = `${req.protocol}://${req.get('host')}`; // url מאפשר לתבנית לטעון קבצים בצורה מלאה דרך
      const viewName = resolvePdfView(quote.templateKey); //  להדפיס לפי תבנית view בוחר איזה

      const html = await new Promise((resolve, reject) => { // await כדי להשתמש ב promise ב render אבל לא שולחים לדפדפן  עוטף את html ל handlebars רינדור של
        res.render(viewName, { layout: false, quote, total, baseUrl }, (err, outHtml) => { // pdf היה מתווסף ככה ל layout ה pdf בתוך ה main / auth handlebars כי אני לא רוצה את ה layout false ה
          if (err) return reject(err);
          resolve(outHtml);
        });
      });

      // ומחכה שכל התוכן והמשאבים ייטענו לתוך דף html וטוען את ה chromium פותח
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] }); // אומר אין יותר בקשות רשת  networkidle0 אומר הדומ נטען domcontentloaded
      await page.emulateMediaType('screen'); // css משתמש ב

      const pdfBuffer = await page.pdf({ // pdf מייצר
        format: 'A4',
        printBackground: true, // חשוב כדי שצבעים ורקעים יודפסו
        margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' }, // כדי שלא ייחתך
      });

      await browser.close(); // וסגירת הטאב הזמני שנפתח

      // יוצר שם לקובץ עם מספר וכותרת
      const safeTitle = sanitizeFilename(quote.title);
      const num = quote.quoteNumber ? `#${pad4(quote.quoteNumber)}-` : '';
      const fileBase = `${num}${safeTitle}`;
      const asciiName = toAsciiFallback(fileBase);

      res.setHeader('Content-Type', 'application/pdf'); // attachment ותוריד אותו כקובץ pdf אומר לדפדפן שזה
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${encodeURIComponent(fileBase)}.pdf` // שם קובץ בטוח
      );

      return res.send(pdfBuffer);
    } catch (err) {
      console.error(err);
      return res.status(500).send(err.message);
    }
  },

  //  לתצוגה מקדימה אני רוצה לעשות את זה בעתיד get פעולת
  // previewPdfHtml: async (req, res) => {
  //   const ownerId = req.session.userId;
  //   const id = req.params.id;

  //   try {
  //     const [quote, user] = await Promise.all([
  //       Quote.findOne({ _id: id, ownerId }).lean(),
  //       User.findById(ownerId).lean(),
  //     ]);

  //     if (!quote) return res.status(404).send('Quote not found');

  //     // ✅ תמיד מה-Settings
  //     applyUserSettingsToQuote(quote, user);

  //     const total = (quote.items || []).reduce(
  //       (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
  //       0
  //     );

  //     const baseUrl = `${req.protocol}://${req.get('host')}`;
  //     const viewName = resolvePdfView(quote.templateKey);

  //     return res.render(viewName, { layout: false, quote, total, baseUrl });
  //   } catch (err) {
  //     return res.status(500).send(err.message);
  //   }
  // },

  // למחיקת הצעה delete פעולת
  remove: async (req, res) => {
    const ownerId = req.session.userId; // מי המשתמש
    const id = req.params.id; // מה רוצה למחוק

    try {
      await Quote.deleteOne({ _id: id, ownerId }); // מחיקה רק אם ההצעה שייכת למשתמש הנוכחי וככה משתמש לא יכול למחוק הצעות של מישהו אחר
      return res.redirect('/quotes'); // אחרי מחיקה חוזר לעמוד הצעות המחיר
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
};

module.exports = quotesCtrl;