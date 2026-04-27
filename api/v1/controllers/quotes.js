const mongoose = require('mongoose');
const Quote = require('../models/quotes');
const User = require('../models/users');
const puppeteer = require('puppeteer');

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }

  return browserPromise;
}

async function closeBrowser() {
  if (!browserPromise) return;

  try {
    const browser = await browserPromise;
    await browser.close();
  } catch (err) {
    console.warn('Failed to close Puppeteer browser:', err.message);
  } finally {
    browserPromise = null;
  }
}

process.once('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseItems(itemsJson) {
  try {
    const items = JSON.parse(itemsJson || '[]');
    return Array.isArray(items) ? items : [];
  } catch (err) {
    return [];
  }
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'חובה להוסיף לפחות שורה אחת להצעת המחיר';
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const name = String(item.name || '').trim();
    const unit = String(item.unit || '').trim();

    const price = Number(item.price);
    const qty = Number(item.qty);

    if (!name) {
      return `חובה למלא שם מוצר בשורה ${i + 1}`;
    }

    if (!unit) {
      return `חובה למלא יחידה בשורה ${i + 1}`;
    }

    if (!Number.isFinite(price) || price < 0) {
      return `חובה למלא מחיר תקין בשורה ${i + 1}`;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      return `חובה למלא כמות תקינה בשורה ${i + 1}`;
    }
  }

  return null;
}

function normalizeItems(items) {
  return items.map((item) => ({
    name: String(item.name || '').trim(),
    unit: String(item.unit || '').trim(),
    price: Number(item.price),
    qty: Number(item.qty),
  }));
}

function sanitizeFilename(name) {
  const s = String(name || '').trim();

  if (!s) return 'quote';

  return s
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
    .trim();
}

function resolvePdfView(templateKey) {
  if (templateKey === 'modern') {
    return 'quotes/pdf-modern';
  }

  return 'quotes/pdf-sandbox';
}

function normalizeTemplateKey(templateKey) {
  return templateKey === 'modern' ? 'modern' : 'sandbox';
}

function applyUserSettingsToQuote(quote, user) {
  if (!quote) return quote;

  quote.businessName = user?.businessName ?? quote.businessName ?? '';
  quote.slogan = user?.slogan ?? quote.slogan ?? '';
  quote.phone = user?.phone ?? quote.phone ?? '';
  quote.themeColor = user?.themeColor ?? quote.themeColor ?? '#1f2937';
  quote.logoUrl = user?.logoPath ?? quote.logoUrl ?? '';

  quote.items = Array.isArray(quote.items) ? quote.items : [];
  quote.templateKey = normalizeTemplateKey(quote.templateKey);

  return quote;
}

function buildQuoteForRender({
  id,
  user,
  businessName,
  title,
  quoteDate,
  themeColor,
  items,
  templateKey,
}) {
  return {
    _id: id,
    businessName: businessName || user?.businessName || '',
    slogan: user?.slogan || '',
    phone: user?.phone || '',
    title: title || 'הצעת מחיר',
    quoteDate: quoteDate || '',
    themeColor: themeColor || user?.themeColor || '#1f2937',
    logoUrl: user?.logoPath || '',
    items,
    templateKey: normalizeTemplateKey(templateKey),
    status: 'draft',
  };
}

function calcQuoteTotal(items) {
  return (items || []).reduce((sum, it) => {
    const qty = Number(it.qty) || 0;
    const price = Number(it.price) || 0;

    return sum + qty * price;
  }, 0);
}

const quotesCtrl = {
  listPage: async (req, res) => {
    try {
      const ownerId = req.session.userId;

      const quotes = await Quote.find({ ownerId })
        .sort({ createdAt: -1 })
        .lean();

      return res.render('quotes/index', {
        title: 'הצעת מחיר',
        quotes,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  newPage: async (req, res) => {
    try {
      const ownerId = req.session.userId;
      const user = await User.findById(ownerId).lean();

      if (!user) {
        return res.status(401).send('User not found');
      }

      return res.render('quotes/editor', {
        title: 'יצירת הצעת מחיר',
        quote: {
          businessName: user.businessName || '',
          slogan: user.slogan || '',
          phone: user.phone || '',
          title: 'הצעת מחיר',
          quoteDate: '',
          themeColor: user.themeColor || '#1f2937',
          logoUrl: user.logoPath || '',
          items: [],
          templateKey: 'sandbox',
          status: 'draft',
        },
        isEdit: false,
      });
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  create: async (req, res) => {
    try {
      const ownerId = req.session.userId;

      const {
        businessName,
        title,
        quoteDate,
        themeColor,
        itemsJson,
        action,
        templateKey,
      } = req.body;

      const parsedItems = parseItems(itemsJson);
      const itemsError = validateItems(parsedItems);

      const user = await User.findById(ownerId);

      if (!user) {
        return res.status(401).send('User not found');
      }

      if (itemsError) {
        return res.status(400).render('quotes/editor', {
          title: 'יצירת הצעת מחיר',
          quote: buildQuoteForRender({
            user,
            businessName,
            title,
            quoteDate,
            themeColor,
            items: parsedItems,
            templateKey,
          }),
          isEdit: false,
          error: itemsError,
        });
      }

      const items = normalizeItems(parsedItems);

      const quoteNumber = user.nextQuoteNumber;
      user.nextQuoteNumber += 1;
      await user.save();

      const q = await Quote.create({
        ownerId,
        quoteNumber,

        businessName: businessName || user.businessName || '',
        slogan: user.slogan || '',
        phone: user.phone || '',
        themeColor: themeColor || user.themeColor || '#1f2937',
        logoUrl: user.logoPath || '',

        title: title || 'הצעת מחיר',
        quoteDate: quoteDate || '',
        items,
        templateKey: normalizeTemplateKey(templateKey),
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
    try {
      const ownerId = req.session.userId;
      const id = req.params.id;

      if (!isValidObjectId(id)) {
        return res.status(400).send('Invalid quote id');
      }

      const [quote, user] = await Promise.all([
        Quote.findOne({ _id: id, ownerId }).lean(),
        User.findById(ownerId).lean(),
      ]);

      if (!quote) {
        return res.status(404).send('לא נמצאה הצעת מחיר');
      }

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
    try {
      const ownerId = req.session.userId;
      const id = req.params.id;

      if (!isValidObjectId(id)) {
        return res.status(400).send('Invalid quote id');
      }

      const {
        businessName,
        title,
        quoteDate,
        themeColor,
        itemsJson,
        action,
        templateKey,
      } = req.body;

      const parsedItems = parseItems(itemsJson);
      const itemsError = validateItems(parsedItems);

      const user = await User.findById(ownerId).lean();

      if (!user) {
        return res.status(401).send('User not found');
      }

      if (itemsError) {
        return res.status(400).render('quotes/editor', {
          title: 'עריכת הצעת מחיר',
          quote: buildQuoteForRender({
            id,
            user,
            businessName,
            title,
            quoteDate,
            themeColor,
            items: parsedItems,
            templateKey,
          }),
          isEdit: true,
          error: itemsError,
        });
      }

      const items = normalizeItems(parsedItems);

      const result = await Quote.updateOne(
        { _id: id, ownerId },
        {
          businessName: businessName || '',
          slogan: user.slogan || '',
          phone: user.phone || '',
          themeColor: themeColor || user.themeColor || '#1f2937',
          logoUrl: user.logoPath || '',

          title: title || 'הצעת מחיר',
          quoteDate: quoteDate || '',
          items,
          templateKey: normalizeTemplateKey(templateKey),
          status: 'draft',
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).send('לא נמצאה הצעת מחיר');
      }

      if (action === 'saveAndPdf') {
        return res.redirect(`/quotes/${id}/pdf`);
      }

      return res.redirect(`/quotes/${id}/edit`);
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },

  downloadPdf: async (req, res) => {
    let page;

    try {
      const ownerId = req.session.userId;
      const id = req.params.id;

      if (!isValidObjectId(id)) {
        return res.status(400).send('Invalid quote id');
      }

      const [quote, user] = await Promise.all([
        Quote.findOne({ _id: id, ownerId }).lean(),
        User.findById(ownerId).lean(),
      ]);

      if (!quote) {
        return res.status(404).send('Quote not found');
      }

      applyUserSettingsToQuote(quote, user);

      const total = calcQuoteTotal(quote.items);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const viewName = resolvePdfView(quote.templateKey);

      const html = await new Promise((resolve, reject) => {
        res.render(
          viewName,
          {
            layout: false,
            quote,
            total,
            baseUrl,
          },
          (err, outHtml) => {
            if (err) return reject(err);
            resolve(outHtml);
          }
        );
      });

      const browser = await getBrowser();
      page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle2',
      });

      await page.evaluate(async () => {
        const images = Array.from(document.images);

        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();

            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          })
        );
      });

      await page.emulateMediaType('print');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
        preferCSSPageSize: true,
      });

      const safeTitle = sanitizeFilename(quote.title || 'quote');
      const fileName = `${safeTitle}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="quote.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.end(pdfBuffer);
    } catch (err) {
      console.error(err);

      browserPromise = null;

      return res.status(500).send(err.message);
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (err) {
          console.warn('Failed to close PDF page:', err.message);
        }
      }
    }
  },

  remove: async (req, res) => {
    try {
      const ownerId = req.session.userId;
      const id = req.params.id;

      if (!isValidObjectId(id)) {
        return res.status(400).send('Invalid quote id');
      }

      await Quote.deleteOne({ _id: id, ownerId });

      return res.redirect('/quotes');
    } catch (err) {
      return res.status(500).send(err.message);
    }
  },
};

module.exports = quotesCtrl;