// api/v1/public/js/quote-editor.js

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

  const PRODUCTS_CACHE_KEY = 'quote_products_cache_v1';
  let productsCache = [];

  function loadProductsCache() {
    try {
      const saved = localStorage.getItem(PRODUCTS_CACHE_KEY);
      productsCache = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(productsCache)) {
        productsCache = [];
      }
    } catch {
      productsCache = [];
    }

    fetch('/products/all', {
      method: 'GET',
      credentials: 'same-origin',
    })
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then((products) => {
        productsCache = Array.isArray(products) ? products : [];
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(productsCache));
      })
      .catch(() => {});
  }

  loadProductsCache();

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatMoney(n) {
    const num = Number(n);
    const safe = Number.isFinite(num) ? num : 0;
    return `${safe.toFixed(2)} ₪`;
  }

  function toNumberOr(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }

  function clampMin(n, min) {
    const x = Number.isFinite(n) ? n : min;
    return x < min ? min : x;
  }

  function updateCalculatedFields(idx) {
    const item = items[idx];
    if (!item) return;

    const qty = Number(item.qty) || 0;

    if (Number.isFinite(item.baseUnit)) {
      item.unit = String(item.baseUnit * qty);
    }

    if (Number.isFinite(item.basePrice)) {
      item.price = item.basePrice;
    }
  }

  function syncHiddenItemsJson() {
    itemsJsonInput.value = JSON.stringify(items);
  }

  function addItem(defaults = {}) {
    const qty = clampMin(toNumberOr(defaults.qty ?? 1, 1), 0);
    const baseUnit = toNumberOr(defaults.baseUnit ?? defaults.unit, null);
    const basePrice = toNumberOr(defaults.basePrice ?? defaults.price, 0);

    items.push({
      name: String(defaults.name || ''),
      qty,
      unit: baseUnit !== null ? String(baseUnit * qty) : String(defaults.unit || '1'),
      price: clampMin(basePrice, 0),
      baseUnit,
      basePrice,
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
               style="
                 position:fixed;
                 background:#fff;
                 border:1px solid #e5e7eb;
                 border-radius:10px;
                 box-shadow:0 10px 22px rgba(0,0,0,.08);
                 overflow:hidden;
                 display:none;
                 z-index:9999;
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

  function renderPreview() {
    const rawTemplateKey = form.elements.templateKey?.value || 'sandbox';
    const templateKey = rawTemplateKey === 'modern' ? 'modern' : 'sandbox';

    const businessName = form.elements.businessName?.value || '';
    const title = form.elements.title?.value || 'הצעת מחיר';
    const quoteDate = '';
    const themeColor = form.elements.themeColor?.value || '#1f2937';

    const logoUrl = String(quote.logoUrl || '').trim();
    const slogan = String(quote.slogan || '').trim();
    const phone = String(quote.phone || '').trim();

    const total = items.reduce(
      (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
      0
    );

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

    const root = previewBox.shadowRoot || previewBox.attachShadow({ mode: 'open' });

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
              <th>כמות מגשים</th>
              <th>יחידות במגש</th>
              <th>מחיר למגש</th>
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
              <th>מוצר</th>
              <th>כמות</th>
              <th>יחידה</th>
              <th>מחיר</th>
              <th>סה״כ</th>
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

        .emptyRow {
          text-align:center;
          opacity:.7;
        }

        .cell-name {
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .cell-unit {
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
          text-align: center;
        }

        .cell-num {
          white-space: nowrap;
          text-align: center;
        }

        table {
          width:100%;
          border-collapse:collapse;
          margin-top:12px;
          font-size:12.5px;
          table-layout: fixed;
        }

        th,
        td {
          padding:8px;
          vertical-align:top;
          min-width:0;
        }

        th {
          text-align: center;
        }

        .slogan {
          margin-top: 4px;
          font-size: 13px;
          opacity: .85;
        }

        .phone {
          margin-top: 2px;
          font-size: 13px;
          font-weight: 700;
          opacity: .95;
        }

        .qprev {
          font-family: "Noto Sans Hebrew", Arial, sans-serif;
          direction: rtl;
          color:#111;
          background:#fff;
          padding:18px;
          border-radius:12px;
        }

        .qprev .topRow {
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:flex-start;
        }

        .qprev .biz {
          font-size:18px;
          font-weight:700;
        }

        .qprev .title {
          opacity:.85;
          margin-top:6px;
        }

        .qprev .date {
          opacity:.8;
          text-align:left;
          white-space:nowrap;
        }

        .qprev .total {
          margin-top:12px;
          font-weight:700;
          font-size:14px;
          text-align:left;
        }

        .qprev .logo {
          max-height:50px;
          max-width:140px;
          object-fit:contain;
          display:block;
          margin-bottom:8px;
        }

        .qprev.modern .card {
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:16px;
        }

        .qprev.modern .band {
          height:10px;
          border-radius:10px;
          background:${themeColor};
          margin-bottom:14px;
        }

        .qprev.modern th,
        .qprev.modern td {
          border:1px solid #e5e7eb;
        }

        .qprev.modern th {
          background:#f9fafb;
          font-weight:700;
        }

        .sandbox {
          font-family: "Noto Sans Hebrew", Arial, sans-serif;
          direction: rtl;
          color:#111;
          background:#fff;
          padding:18px;
          border-radius:12px;
        }

        .sandbox .header {
          position:relative;
          border-bottom:2px solid ${themeColor};
          margin-bottom:14px;
          padding:80px 12px 12px 120px;
        }

        .sandbox .logoCorner {
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

        .sandbox .topRow {
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:flex-start;
        }

        .sandbox .biz {
          font-size:16px;
          font-weight:800;
          line-height:1.2;
        }

        .sandbox .docTitle {
          margin-top:10px;
          opacity:.92;
          font-size:14px;
          font-weight:700;
        }

        .sandbox .meta {
          text-align:left;
          white-space:nowrap;
          font-size:12px;
          opacity:.75;
        }

        .sandbox colgroup col:nth-child(1){ width:42%; }
        .sandbox colgroup col:nth-child(2){ width:10%; }
        .sandbox colgroup col:nth-child(3){ width:14%; }
        .sandbox colgroup col:nth-child(4){ width:17%; }
        .sandbox colgroup col:nth-child(5){ width:17%; }

        .sandbox th,
        .sandbox td {
          border-bottom:1px solid ${themeColor};
        }

        .sandbox th {
          background:${themeColor};
          color:black;
          font-weight:700;
          text-align: center;
        }

        .sandbox .totals {
          margin-top:12px;
          display:flex;
          justify-content:flex-end;
        }

        .sandbox .totalBox {
          min-width:260px;
          border:1px solid ${themeColor};
          border-radius:12px;
          padding:10px 12px;
          text-align:left;
        }

        .sandbox .totalRow {
          display:flex;
          justify-content:space-between;
          gap:12px;
          font-size:13px;
          padding:4px 0;
        }

        .sandbox .totalRow strong {
          font-size:14px;
        }
      </style>

      ${
        templateKey === 'modern'
          ? `<div class="qprev modern">${modernHtml}</div>`
          : `<div class="sandbox">${sandboxHtml}</div>`
      }
    `;
  }

  function render() {
    renderItems();
    renderPreview();
    syncHiddenItemsJson();
  }

  let suggestTimer = null;
  let lastSuggestIdx = null;

  function fetchSuggestions(q, cb) {
    const text = String(q || '').trim().toLowerCase();

    if (text.length < 2) {
      cb([]);
      return;
    }

    const result = productsCache
      .filter((p) => String(p.name || '').toLowerCase().includes(text))
      .slice(0, 10);

    cb(result);
  }

  function getSuggestBox(idx) {
    return itemsArea.querySelector(`[data-suggest="${idx}"]`);
  }

  function positionSuggestBox(idx) {
    const input = itemsArea.querySelector(`[data-field="name"][data-idx="${idx}"]`);
    const box = getSuggestBox(idx);

    if (!input || !box) return;

    const rect = input.getBoundingClientRect();

    box.style.position = 'fixed';
    box.style.top = `${rect.bottom + 4}px`;
    box.style.left = `${rect.left}px`;
    box.style.right = 'auto';
    box.style.width = `${rect.width}px`;
    box.style.maxHeight = '220px';
    box.style.overflowY = 'auto';
    box.style.zIndex = '9999';
  }

  function hideSuggestions(idx) {
    const box = getSuggestBox(idx);
    if (!box) return;

    box.style.display = 'none';
    box.innerHTML = '';

    if (lastSuggestIdx === idx) {
      lastSuggestIdx = null;
    }
  }

  function hideAllSuggestions() {
    if (lastSuggestIdx !== null) {
      hideSuggestions(lastSuggestIdx);
    }

    lastSuggestIdx = null;
  }

  function showSuggestions(idx, list) {
    const box = getSuggestBox(idx);
    if (!box) return;

    if (!Array.isArray(list) || list.length === 0) {
      hideSuggestions(idx);
      return;
    }

    box.innerHTML = list
      .map((p) => {
        const name = escapeHtml(p.name || '');
        const unit = escapeHtml(p.unit || '1');
        const price = Number(p.price) || 0;

        return `
          <div data-pick="${idx}"
               data-id="${escapeHtml(p._id || '')}"
               data-name="${name}"
               data-price="${price}"
               data-unit="${unit}"
               style="padding:10px 10px;cursor:pointer;border-bottom:1px solid #f1f5f9;">
            <b>${name}</b>
            <span style="opacity:.7"> — ${price.toFixed(2)} ₪ / ${unit}</span>
          </div>
        `;
      })
      .join('');

    positionSuggestBox(idx);

    box.style.display = 'block';
    lastSuggestIdx = idx;
  }

  addItemBtn.addEventListener('click', () => addItem());

  itemsArea.addEventListener('scroll', () => {
    if (lastSuggestIdx !== null) {
      positionSuggestBox(lastSuggestIdx);
    }
  });

  window.addEventListener('scroll', () => {
    if (lastSuggestIdx !== null) {
      positionSuggestBox(lastSuggestIdx);
    }
  });

  window.addEventListener('resize', () => {
    if (lastSuggestIdx !== null) {
      positionSuggestBox(lastSuggestIdx);
    }
  });

  itemsArea.addEventListener('input', (e) => {
    const el = e.target;

    const idx = Number(el.dataset.idx);
    const field = el.dataset.field;

    if (!Number.isFinite(idx) || !field) return;
    if (!items[idx]) return;

    if (field === 'qty') {
      const val = el.value === '' ? 0 : clampMin(toNumberOr(el.value, 0), 0);

      items[idx].qty = val;
      updateCalculatedFields(idx);

      render();
      return;
    }

    if (field === 'price') {
      const val = el.value === '' ? 0 : clampMin(toNumberOr(el.value, 0), 0);

      items[idx].price = val;
      items[idx].basePrice = val;

      renderPreview();
      syncHiddenItemsJson();
      return;
    }

    if (field === 'unit') {
      items[idx].unit = String(el.value ?? '');

      const numericUnit = toNumberOr(el.value, null);
      items[idx].baseUnit =
        numericUnit !== null && items[idx].qty
          ? numericUnit / Number(items[idx].qty)
          : null;

      renderPreview();
      syncHiddenItemsJson();
      return;
    }

    if (field === 'name') {
      items[idx].name = String(el.value ?? '');

      renderPreview();
      syncHiddenItemsJson();

      const q = String(el.value || '').trim();

      clearTimeout(suggestTimer);

      if (q.length < 2) {
        hideSuggestions(idx);
        return;
      }

      suggestTimer = setTimeout(() => {
        fetchSuggestions(q, (list) => showSuggestions(idx, list));
      }, 150);

      return;
    }
  });

  itemsArea.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-action="remove"]');

    if (removeBtn) {
      const idx = Number(removeBtn.dataset.idx);

      if (!Number.isFinite(idx)) return;

      items.splice(idx, 1);
      hideAllSuggestions();
      render();
      return;
    }

    const pick = e.target.closest('[data-pick]');

    if (pick) {
      const idx = Number(pick.dataset.pick);

      if (!Number.isFinite(idx) || !items[idx]) return;

      const pickedUnit = toNumberOr(pick.dataset.unit, null);
      const pickedPrice = clampMin(toNumberOr(pick.dataset.price, 0), 0);
      const currentQty = Number(items[idx].qty) || 1;

      items[idx].name = pick.dataset.name || '';
      items[idx].qty = currentQty;

      items[idx].baseUnit = pickedUnit;
      items[idx].basePrice = pickedPrice;

      items[idx].unit =
        pickedUnit !== null ? String(pickedUnit * currentQty) : pick.dataset.unit || '1';

      items[idx].price = pickedPrice;

      hideSuggestions(idx);
      render();
      return;
    }
  });

  document.addEventListener('click', (e) => {
    if (!itemsArea.contains(e.target)) {
      hideAllSuggestions();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAllSuggestions();
    }
  });

  form.addEventListener('input', () => renderPreview());
  form.addEventListener('change', () => renderPreview());

  form.addEventListener('submit', () => {
    hideAllSuggestions();
    syncHiddenItemsJson();
  });

  if (items.length === 0) {
    addItem();
  } else {
    render();
  }
})();