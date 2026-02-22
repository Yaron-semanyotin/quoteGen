(() => {
  const quote = window.__QUOTE__ || {};
  const items = Array.isArray(quote.items) ? quote.items : [];

  const form = document.getElementById('quoteForm');
  const itemsArea = document.getElementById('itemsArea');
  const addItemBtn = document.getElementById('addItemBtn');
  const itemsJsonInput = document.getElementById('itemsJson');
  const previewBox = document.getElementById('previewBox');

  if (!form || !itemsArea || !addItemBtn || !itemsJsonInput || !previewBox) {
    console.error('Missing editor elements in DOM');
    return;
  }

  // =========================
  // Items
  // =========================
  function addItem(defaults = {}) {
    items.push({
      name: defaults.name || '',
      qty: Number(defaults.qty ?? 1),
      unit: defaults.unit || 'יחידה',
      price: Number(defaults.price ?? 0),
    });
    render();
  }

  function renderItems() {
    itemsArea.innerHTML = '';

    items.forEach((it, idx) => {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns =
        'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto';
      row.style.gap = '8px';
      row.style.marginBottom = '8px';
      row.style.alignItems = 'center';
      row.style.minWidth = '0';

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
               style="position:absolute;top:100%;right:0;left:0;background:#fff;border:1px solid #fff;display:none;z-index:50;"></div>
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

        <button type="button" data-action="remove" data-idx="${idx}">X</button>
      `;

      itemsArea.appendChild(row);
    });
  }

  // =========================
  // Preview
  // =========================
  function renderPreview() {
    const templateKey = form.elements.templateKey?.value || 'classic';

    const businessName = form.elements.businessName?.value || '';
    const title = form.elements.title?.value || 'הצעת מחיר';
    const quoteDate = form.elements.quoteDate?.value || '';
    const themeColor = form.elements.themeColor?.value || '#1f2937';
    const logoUrl = quote.logoUrl || '';

    // ✅ מגיע מהשרת (הגדרות משתמש) — לא מהטופס
    const slogan = String(quote.slogan || '').trim();
    const phone = String(quote.phone || '').trim();

    const logoHtml = logoUrl
      ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="logo" />`
      : '';

    const sloganHtml = slogan ? `<div class="slogan">${escapeHtml(slogan)}</div>` : '';
    const phoneHtml = phone ? `<div class="phone">טלפון: ${escapeHtml(phone)}</div>` : '';

    const total = items.reduce(
      (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
      0
    );

    const rowsHtml = items.length
      ? items
          .map(
            (it) => `
            <tr>
              <td class="cell-name">${escapeHtml(it.name)}</td>
              <td class="cell-num">${Number(it.qty) || 0}</td>
              <td class="cell-unit">${escapeHtml(it.unit)}</td>
              <td class="cell-num">${formatMoney(it.price)}</td>
              <td class="cell-num">${formatMoney((Number(it.qty) || 0) * (Number(it.price) || 0))}</td>
            </tr>
          `
          )
          .join('')
      : `<tr><td colspan="5" class="emptyRow">אין שורות</td></tr>`;

    const root = previewBox.shadowRoot || previewBox.attachShadow({ mode: 'open' });

    const sandboxHtml = `
      <div class="page">
        <div class="header">
          ${logoUrl ? `<img class="logoCorner" src="${escapeHtml(logoUrl)}" alt="logo" />` : ''}

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

    const classicOrClean = `
      <div class="wrap">
        <div class="topRow">
          <div>
            ${logoHtml}
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

    const modern = `
      <div class="card">
        <div class="band"></div>

        <div class="topRow">
          <div>
            ${logoHtml}
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
        .phone { margin-top: 2px; font-size: 13px; font-weight: 700; opacity: .95; }

        /* ===== Classic/Clean/Modern ===== */
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

        .qprev.classic .wrap{ border-right:6px solid ${themeColor}; padding-right:12px; }
        .qprev.classic th, .qprev.classic td{ border:1px solid #ddd; }
        .qprev.classic th{ background:#f7f7f7; font-weight:700; }

        .qprev.clean .wrap{ padding:8px 0 12px; border-bottom:2px solid #111; }
        .qprev.clean th, .qprev.clean td{ border-bottom:1px solid #e5e5e5; }
        .qprev.clean th{ font-weight:700; text-align:right; }

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
        templateKey === 'sandbox'
          ? `<div class="sandbox">${sandboxHtml}</div>`
          : `<div class="qprev ${templateKey}">${templateKey === 'modern' ? modern : classicOrClean}</div>`
      }
    `;
  }

  // =========================
  // Sync hidden JSON
  // =========================
  function syncHiddenItemsJson() {
    itemsJsonInput.value = JSON.stringify(items);
  }

  function render() {
    renderItems();
    renderPreview();
    syncHiddenItemsJson();
  }

  // =========================
  // Events
  // =========================
  addItemBtn.addEventListener('click', () => addItem());

  itemsArea.addEventListener('input', (e) => {
    const el = e.target;
    const idx = Number(el.dataset.idx);
    const field = el.dataset.field;
    if (Number.isNaN(idx) || !field) return;

    if (field === 'qty' || field === 'price') items[idx][field] = Number(el.value);
    else items[idx][field] = el.value;

    renderPreview();
    syncHiddenItemsJson();
  });

  itemsArea.addEventListener('click', (e) => {
    const el = e.target;
    if (el.dataset.action !== 'remove') return;

    const idx = Number(el.dataset.idx);
    if (Number.isNaN(idx)) return;

    items.splice(idx, 1);
    render();
  });

  form.addEventListener('input', () => renderPreview());
  form.addEventListener('change', () => renderPreview());

  form.addEventListener('submit', () => {
    syncHiddenItemsJson();
  });

  // =========================
  // Autocomplete (נשאר כמו אצלך)
  // =========================
  let suggestTimer = null;

  function fetchSuggestions(q, cb) {
    fetch(`/products/search?q=${encodeURIComponent(q)}`, {
      method: 'GET',
      credentials: 'same-origin',
    })
      .then(async (r) => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok) return [];
        if (!ct.includes('application/json')) return [];
        return r.json();
      })
      .then(cb)
      .catch(() => cb([]));
  }

  function showSuggestions(idx, list) {
    const box = document.querySelector(`[data-suggest="${idx}"]`);
    if (!box) return;

    if (!list.length) {
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }

    box.innerHTML = list
      .map(
        (p) => `
          <div data-pick="${idx}" data-id="${p._id}"
               data-name="${escapeHtml(p.name)}"
               data-price="${p.price}"
               data-unit="${escapeHtml(p.unit)}"
               style="padding:8px;cursor:pointer;border-bottom:1px solid #eee;">
            <b>${escapeHtml(p.name)}</b>
            <span style="opacity:.7"> — ${p.price} / ${escapeHtml(p.unit)}</span>
          </div>
        `
      )
      .join('');

    box.style.display = 'block';
  }

  itemsArea.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.field !== 'name') return;

    const idx = Number(el.dataset.idx);
    if (Number.isNaN(idx)) return;

    const q = String(el.value || '').trim();
    clearTimeout(suggestTimer);

    if (q.length < 2) {
      showSuggestions(idx, []);
      return;
    }

    suggestTimer = setTimeout(() => {
      fetchSuggestions(q, (list) => showSuggestions(idx, list));
    }, 200);
  });

  itemsArea.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick]');
    if (!pick) return;

    const idx = Number(pick.dataset.pick);
    if (Number.isNaN(idx)) return;

    items[idx].name = pick.dataset.name || '';
    items[idx].price = Number(pick.dataset.price) || 0;
    items[idx].unit = pick.dataset.unit || 'יחידה';

    showSuggestions(idx, []);
    render();
  });

  // =========================
  // Init
  // =========================
  if (items.length === 0) addItem();
  else render();

  // =========================
  // Helpers
  // =========================
function formatMoney(n) {
  const num = Number(n) || 0;
  return `${num.toFixed(2)} ₪`;
}

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
})();