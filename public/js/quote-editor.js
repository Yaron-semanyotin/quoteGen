// api/v1/public/js quote-editor.js

(() => { // ולהריץ את הסקריפט מיד כשהדף נטען scope פונקציה שפועלת ישר עוטפת את כל הקוד כדי
  // מהשרת window.__QUOTE__ קולט את
  const quote = window.__QUOTE__ || {};
  // בצורה בטוחה גם אם הנתונים חסרים / שגויים items ומאתחל מערך
  const items = Array.isArray(quote.items) ? quote.items : [];

  // כדי שיוכל לדעת מתי הטופס משתנה id תופס את כל האלמנטים לפי
  const form = document.getElementById('quoteForm');
  const itemsArea = document.getElementById('itemsArea');
  const addItemBtn = document.getElementById('addItemBtn');
  const itemsJsonInput = document.getElementById('itemsJson');
  const previewBox = document.getElementById('previewBox');

  // הקוד היה נשבר אז במקום זאת הוא מדפיס שגיאה לקונסיל ועוצר id או שונה html אם בטעות נמחק אלמנט מה
  if (!form || !itemsArea || !addItemBtn || !itemsJsonInput || !previewBox) {
    console.error('Missing editor elements in DOM');
    return;
  }


  // Helpers

  // dom כדי למנוע שבירת html פונקציה שמנקה טקסט שהמשתמש הכניס לפני שמכניסים אותו ל
  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
  // פונקציה לפורמט אחיד לכסף ממיר ערך למספר אם זה לא מספר תקין מחזיר 0 מציג תמיד מספר עם 2 ספרות אחרי הנקודה וסימן של שקל
  function formatMoney(n) {
    const num = Number(n);
    const safe = Number.isFinite(num) ? num : 0;
    return `${safe.toFixed(2)} ₪`;
  }
  // פונקציות המרה לולידציה tonumberor + clapmin
  // fallback מנסה להפוך למספר אם נכשל מחזיר
  function toNumberOr(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }
  // מבטיח שהמספר לא ירד מתחת למינימום למשל אם המינימום 0 ומישהו מקליד -5 אז זה מחזיר ל0
  function clampMin(n, min) {
    const x = Number.isFinite(n) ? n : min;
    return x < min ? min : x;
  }
  // post כדי שהשרת יקבל את כל השורות בבקשת  itemJson נסתר input לתוך items מסנכרן את המרך
  // js במערך items רגיל אז מחזיקים html השרת לא יודע לקבל מערך ישירות מטופס
  // json נסתר כטקסט input לפני שמגישים טופס שמים אותו בתוך
  // הופך אותו חזרה למערך parseItems() ו string מגיע כ req.body.itemsJson ואז בשרת
  function syncHiddenItemsJson() {
    itemsJsonInput.value = JSON.stringify(items);
  }



  // Items UI

  // preview וב ui עם ערכי ברירת מחדל ואז מרנדר מחדש את ה items מוסיף שורה חדשה ל
  function addItem(defaults = {}) {
    items.push({ // push מוסיף שורה חדשה למערך
      name: String(defaults.name || ''), // כל שדה מקבל ברירת מחדל
      qty: clampMin(toNumberOr(defaults.qty ?? 1, 1), 0),
      unit: String(defaults.unit || '1'),
      price: clampMin(toNumberOr(defaults.price ?? 0, 0), 0),
    });
    render(); // itemsJson ולכדען preview לעדכן htlp כדי לייצר מחדש את השורות ב
  }

  // items מרנדר מחדש את כל שורות הטופס מאפס לפי מערך
  function renderItems() {
    itemsArea.innerHTML = '';

    // במערך ומייצר לו שורת קלט item עובר על כל
    // it זה אובייקט של השורה הנוכחית
    // idx  שלנו לשורה idזה האינדקס זה ה
    items.forEach((it, idx) => {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns =
        'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto';
      row.style.gap = '8px';
      row.style.marginBottom = '8px';
      row.style.alignItems = 'center';
      row.style.minWidth = '0';
      // בנפרד input לכל event listener כדי לזהות באירועים איזה שורה ואיזה שדה השנה בלי להוסיף data-field וב data-idx משתמש ב 
      // autocomplete זה סוג של קופסה ריקה שמחכה להצעות מוצרים מהשרת הכוונה ל data-suggest
      row.innerHTML = `
        <div style="position:relative; min-width:0;">
          <input
            data-field="name"
            data-idx="${idx}"
            placeholder="שם מוצר"
            value="${escapeHtml(it.name)}"
            autocomplete="off"
            style="width:100%; min-width:0;"
          />
          
          <div data-suggest="${idx}"
               style="
                 position:absolute;
                 top:100%;
                 right:0;
                 left:0;
                 background:#fff;
                 border:1px solid #e5e7eb;
                 border-radius:10px;
                 box-shadow:0 10px 22px rgba(0,0,0,.08);
                 overflow:hidden;
                 display:none;
                 z-index:50;
               ">
          </div>
        </div>

        <input data-field="qty" data-idx="${idx}"
               type="number" min="0" step="1" value="${it.qty}"
               style="width:100%; min-width:0;" />

        <input data-field="unit" data-idx="${idx}"
               placeholder="יחידה / שעה" value="${escapeHtml(it.unit)}"
               style="width:100%; min-width:0;" />

        <input data-field="price" data-idx="${idx}"
               type="number" min="0" step="0.01" value="${it.price}"
               style="width:100%; min-width:0;" />

        <button type="button" class="btn btn-danger" data-action="remove" data-idx="${idx}">✕</button>
      `;

      itemsArea.appendChild(row);
    });
  }


  // Preview
  function renderPreview() {
    // שבטופס ולפי זה נבחרת תבניתselect קורא את הערך מה
    const rawTemplateKey = form.elements.templateKey?.value || 'sandbox';
    const templateKey = rawTemplateKey === 'modern' ? 'modern' : 'sandbox';
    // מביא שדות מהטופס
    const businessName = form.elements.businessName?.value || '';
    const title = form.elements.title?.value || 'הצעת מחיר';
    const quoteDate = form.elements.quoteDate?.value || '';
    const themeColor = form.elements.themeColor?.value || '#1f2937';

    // מביא שדות מהשרת
    const logoUrl = String(quote.logoUrl || '').trim();
    const slogan = String(quote.slogan || '').trim();
    const phone = String(quote.phone || '').trim();
    // מחשב סה"כ לתשלום בזמן אמת
    const total = items.reduce(
      (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
      0
    );
    // אם אין שורות מציג שורה אחת שאומרת שאיו שורות tr אם יש שורות אז יוצר
    // html כדי לא להיכנס ל escapeHTML פה משתמשים ב
    const rowsHtml = items.length
      ? items
          .map((it) => {
            const qty = Number(it.qty) || 0;
            const price = Number(it.price) || 0;
            return `
              <tr>
                <td class="cell-name">${escapeHtml(it.name)}</td>
                <td class="cell-num">${qty}</td>
                <td class="cell-unit">${escapeHtml(it.unit)}</td>
                <td class="cell-num">${formatMoney(price)}</td>
                <td class="cell-num">${formatMoney(qty * price)}</td>
              </tr>
            `;
          })
          .join('')
      : `<tr><td colspan="5" class="emptyRow">אין שורות</td></tr>`;

    const sloganHtml = slogan ? `<div class="slogan">${escapeHtml(slogan)}</div>` : '';
    const phoneHtml = phone ? `<div class="phone">טלפון: ${escapeHtml(phone)}</div>` : '';
    // שלא יתנגשו עם שאר הדף css html לתצוגה מקדימה בלייב המבודדת shadow dom
    const root = previewBox.shadowRoot || previewBox.attachShadow({ mode: 'open' });

    //  Sandbox
    const sandboxHtml = `
      <div class="page">
        <div class="header">
          ${
            logoUrl
              ? `<img class="logoCorner" src="${escapeHtml(logoUrl)}" alt="logo" />`
              : ''
          }

          <div class="topRow">
            <div>
              <div class="biz">${escapeHtml(businessName)}</div>
              ${sloganHtml}
              ${phoneHtml}
            </div>

            <div class="meta">
              ${quoteDate ? `תאריך: <b>${escapeHtml(quoteDate)}</b><br>` : ''}
            </div>
          </div>
        </div>

        <div class="docTitle">${escapeHtml(title)}</div>

        <table>
          <colgroup>
            <col><col><col><col><col>
          </colgroup>
          <thead>
            <tr>
              <th>מוצר</th>
              <th>כמות</th>
              <th>יחידה</th>
              <th>מחיר</th>
              <th>סה״כ</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div class="totals">
          <div class="totalBox">
            <div class="totalRow">
              <span>סה״כ לתשלום</span>
              <strong>${formatMoney(total)}</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    // Modern
    const modernHtml = `
      <div class="card">
        <div class="band"></div>

        <div class="topRow">
          <div>
            ${
              logoUrl
                ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="logo" />`
                : ''
            }
            <div class="biz">${escapeHtml(businessName)}</div>
            ${sloganHtml}
            ${phoneHtml}
            <div class="title">${escapeHtml(title)}</div>
          </div>
          <div class="date">${escapeHtml(quoteDate)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>מוצר</th><th>כמות</th><th>יחידה</th><th>מחיר</th><th>סה״כ</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div class="total">סה״כ לתשלום: ${formatMoney(total)}</div>
      </div>
    `;

    //  shadwroot פנימי בתוך css כולל templatekey sandbox / modenr מרנדר תצוגה לפי
    root.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        :host { display:block; }

        .emptyRow { text-align:center; opacity:.7; }

        .cell-name, .cell-unit {
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .cell-num { white-space: nowrap; text-align: right; }

        table {
          width:100%;
          border-collapse:collapse;
          margin-top:12px;
          font-size:12.5px;
          table-layout: fixed;
        }
        th, td { padding:8px; vertical-align:top; min-width:0; }

        .slogan { margin-top: 4px; font-size: 13px; opacity: .85; }
        .phone  { margin-top: 2px; font-size: 13px; font-weight: 700; opacity: .95; }

        /* ===== Modern ===== */
        .qprev{
          font-family: "Noto Sans Hebrew", Arial, sans-serif;
          direction: rtl;
          color:#111;
          background:#fff;
          padding:18px;
          border-radius:12px;
        }

        .qprev .topRow{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
        .qprev .biz{ font-size:18px; font-weight:700; }
        .qprev .title{ opacity:.85; margin-top:6px; }
        .qprev .date{ opacity:.8; text-align:left; white-space:nowrap; }
        .qprev .total{ margin-top:12px; font-weight:700; font-size:14px; text-align:left; }

        .qprev .logo{ max-height:50px; max-width:140px; object-fit:contain; display:block; margin-bottom:8px; }

        .qprev.modern .card{ border:1px solid #e5e7eb; border-radius:14px; padding:16px; }
        .qprev.modern .band{ height:10px; border-radius:10px; background:${themeColor}; margin-bottom:14px; }
        .qprev.modern th, .qprev.modern td{ border:1px solid #e5e7eb; }
        .qprev.modern th{ background:#f9fafb; font-weight:700; }

        /* ===== Sandbox ===== */
        .sandbox{
          font-family: "Noto Sans Hebrew", Arial, sans-serif;
          direction: rtl;
          color:#111;
          background:#fff;
          padding:18px;
          border-radius:12px;
        }

        .sandbox .header{
          position:relative;
          border-bottom:2px solid ${themeColor};
          margin-bottom:14px;
          padding:80px 12px 12px 120px;
        }
        .sandbox .logoCorner{
          position:absolute;
          top:10px;
          left:20px;
          width:100px;
          height:100px;
          border-radius:50%;
          object-fit:cover;
          background:#fff;
          border:none;
        }
        .sandbox .topRow{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
        .sandbox .biz{ font-size:16px; font-weight:800; line-height:1.2; }
        .sandbox .docTitle{ margin-top:10px; opacity:.92; font-size:14px; font-weight:700; }
        .sandbox .meta{ text-align:left; white-space:nowrap; font-size:12px; opacity:.75; }

        .sandbox colgroup col:nth-child(1){ width:42%; }
        .sandbox colgroup col:nth-child(2){ width:10%; }
        .sandbox colgroup col:nth-child(3){ width:14%; }
        .sandbox colgroup col:nth-child(4){ width:17%; }
        .sandbox colgroup col:nth-child(5){ width:17%; }

        .sandbox th, .sandbox td{ border-bottom:1px solid ${themeColor}; }
        .sandbox th{ background:${themeColor}; color:black; font-weight:700; }

        .sandbox .totals{ margin-top:12px; display:flex; justify-content:flex-end; }
        .sandbox .totalBox{
          min-width:260px;
          border:1px solid ${themeColor};
          border-radius:12px;
          padding:10px 12px;
          text-align:left;
        }
        .sandbox .totalRow{ display:flex; justify-content:space-between; gap:12px; font-size:13px; padding:4px 0; }
        .sandbox .totalRow strong{ font-size:14px; }
      </style>

      ${
        templateKey === 'modern'
          ? `<div class="qprev modern">${modernHtml}</div>`
          : `<div class="sandbox">${sandboxHtml}</div>`
      }
    `;
  }

  // לפני שמירה itemsJson ומסכנכרנת preview מעדרכת ui פונקציה שמרנדרת את שורות ה
  function render() {
    renderItems();
    renderPreview();
    syncHiddenItemsJson();
  }

  // Autocomplete
  let suggestTimer = null;
  let lastSuggestIdx = null;

  function fetchSuggestions(q, cb) {
    fetch(`/products/search?q=${encodeURIComponent(q)}`, { // שולח בקשה לשרת כדי לקבל מוצרים תואמים ומונע בעיות אם יש רווחים ועברית וכו
      method: 'GET',
      credentials: 'same-origin',
    })
      .then(async (r) => { // אז לא נשבר אחרת מחזירים את רשימת המוצרים json אם השרת החזיר שגיאה אז מחזירים רשימה ריקה אם זה לא
        const ct = r.headers.get('content-type') || '';
        if (!r.ok) return [];
        if (!ct.includes('application/json')) return [];
        return r.json();
      })
      .then(cb)
      .catch(() => cb([]));
  }
  // והאינדקס של השורה data-suggest מנהל תפריט הצעות לשל שורה לפי
  function getSuggestBox(idx) { // מוצא את הקופסה של השרה הנכונה
    return itemsArea.querySelector(`[data-suggest="${idx}"]`);
  }

  function hideSuggestions(idx) { // מסתיר ומנקה
    const box = getSuggestBox(idx);
    if (!box) return;
    box.style.display = 'none';
    box.innerHTML = '';
    if (lastSuggestIdx === idx) lastSuggestIdx = null;
  }

  function hideAllSuggestions() { // סוגר את האחרונה הפתוחה
    if (lastSuggestIdx !== null) hideSuggestions(lastSuggestIdx);
    lastSuggestIdx = null;
  }

  function showSuggestions(idx, list) { // של הצעות ומציג html ממלא אותה ב
    const box = getSuggestBox(idx);
    if (!box) return;

    if (!Array.isArray(list) || list.length === 0) {
      hideSuggestions(idx);
      return;
    }

    box.innerHTML = list
      .map(
        (p) => `
          <div data-pick="${idx}"
               data-id="${p._id}"
               data-name="${escapeHtml(p.name)}"
               data-price="${p.price}"
               data-unit="${escapeHtml(p.unit)}"
               style="padding:10px 10px;cursor:pointer;border-bottom:1px solid #f1f5f9;">
            <b>${escapeHtml(p.name)}</b>
            <span style="opacity:.7"> — ${Number(p.price).toFixed(2)} ₪ / ${escapeHtml(p.unit)}</span>
          </div>
        `
      )
      .join('');

    box.style.display = 'block';
    lastSuggestIdx = idx;
  }

  // events
  addItemBtn.addEventListener('click', () => addItem()); // אם לוחצים כל כפתור הוספת שורה מוסיף שורה

  // שינויי ערכים + autocomplete באותו listener (מונע כפילויות)
  itemsArea.addEventListener('input', (e) => {
    const el = e.target;

    const idx = Number(el.dataset.idx);
    const field = el.dataset.field;

    // אם זה לא אחד השדות - לא נוגעים
    if (!Number.isFinite(idx) || !field) return;

    if (!items[idx]) return;

    // 1) עדכון item
    if (field === 'qty') {
      const val = el.value === '' ? 0 : clampMin(toNumberOr(el.value, 0), 0);
      items[idx].qty = val;
      renderPreview();
      syncHiddenItemsJson();
      return;
    }

    if (field === 'price') {
      const val = el.value === '' ? 0 : clampMin(toNumberOr(el.value, 0), 0);
      items[idx].price = val;
      renderPreview();
      syncHiddenItemsJson();
      return;
    }

    if (field === 'unit') {
      items[idx].unit = String(el.value ?? '');
      renderPreview();
      syncHiddenItemsJson();
      return;
    }

    if (field === 'name') {
      items[idx].name = String(el.value ?? '');
      renderPreview();
      syncHiddenItemsJson();

      // 2) autocomplete שמתחיל מ2 תווים
      const q = String(el.value || '').trim();
      clearTimeout(suggestTimer);

      if (q.length < 2) {
        hideSuggestions(idx);
        return;
      }

      suggestTimer = setTimeout(() => {
        fetchSuggestions(q, (list) => showSuggestions(idx, list));
      }, 200);

      return;
    }
  });

  itemsArea.addEventListener('click', (e) => {
    // מחיקה
    const removeBtn = e.target.closest('[data-action="remove"]');
    if (removeBtn) {
      const idx = Number(removeBtn.dataset.idx);
      if (!Number.isFinite(idx)) return;
      items.splice(idx, 1);
      hideAllSuggestions();
      render();
      return;
    }

    // בחירת suggestion
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const idx = Number(pick.dataset.pick);
      if (!Number.isFinite(idx) || !items[idx]) return;

      items[idx].name = pick.dataset.name || '';
      items[idx].price = clampMin(toNumberOr(pick.dataset.price, 0), 0);
      items[idx].unit = pick.dataset.unit || 'יחידה';

      hideSuggestions(idx);

      // לא render מלא כדי לא “לקפוץ” בזמן כתיבה — אבל פה כן כדאי לרנדר הכל כדי לעדכן input values
      render();
      return;
    }
  });

  // סגירת suggestions בלחיצה מחוץ לשורות
  document.addEventListener('click', (e) => {
    if (!itemsArea.contains(e.target)) hideAllSuggestions();
  });

  // Escape סוגר suggestions
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideAllSuggestions();
  });

  // שינויי טופס (template/color/title/date וכו') רק preview
  form.addEventListener('input', () => renderPreview());
  form.addEventListener('change', () => renderPreview());
  // לפני שליחת הטופס סוגר הצעות ומסנכון כדי שהשרת יקבל נתונים עדכניים
  form.addEventListener('submit', () => {
    hideAllSuggestions();
    syncHiddenItemsJson();
  });

  // אם אין שורות מוסיף שורה ראשונה אוטומטית אחרת מרנדר את השורות הקיימות
  if (items.length === 0) addItem();
  else render();
})();