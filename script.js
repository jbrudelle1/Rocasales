/* Rocabella · SPA Devis Mariage & Événement
   Modules: Back-Office (Produits, Packages) · Builder Devis · Viewer Client
   Stockage: localStorage (JSON persistants)
*/

const LS_KEYS = {
  CATALOGUE: 'PRODUITS_CATALOGUE',
  PACKAGES: 'PACKAGES_TEMPLATES',
  QUOTES: 'DEVIS_DATA'
};

const i18n = {
  fr: {
    day: d => `Jour ${d}`,
    nights: n => n > 1 ? `${n} nuits` : `${n} nuit`,
    perPerson: 'par personne',
    perNight: 'par nuit',
    fixed: 'fixe',
    totalHT: 'Total HT',
    totalTTC: 'Total TTC',
    vat: 'TVA',
    expiration: 'Date d’expiration du devis',
    accept: 'Accepter le devis',
    accepted: 'Devis accepté',
    package: 'Package',
    people: 'personnes'
  },
  en: {
    day: d => `Day ${d}`,
    nights: n => n > 1 ? `${n} nights` : `${n} night`,
    perPerson: 'per person',
    perNight: 'per night',
    fixed: 'fixed',
    totalHT: 'Subtotal (excl. VAT)',
    totalTTC: 'Grand total (incl. VAT)',
    vat: 'VAT',
    expiration: 'Quote expiration date',
    accept: 'Accept quote',
    accepted: 'Quote accepted',
    package: 'Package',
    people: 'guests'
  }
};

/* Utilities */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const uid = (p='id_') => p + Math.random().toString(36).slice(2,9);
const parseNum = (v, def=0) => isNaN(parseFloat(v)) ? def : parseFloat(v);
const fmt = (n) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch(e) { return fallback; }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* Seed initial data if empty */
function ensureSeeds() {
  const prod = loadJSON(LS_KEYS.CATALOGUE, null);
  if (!prod) {
    const CATALOGUE = [
      { id: 'p_room', nom_fr: 'Hébergement en chambre double', nom_en: 'Double room', prix_unitaire_ht: 220, type_tarification: 'par_nuit', taux_tva: 0.10 },
      { id: 'p_breakfast', nom_fr: 'Petit-déjeuner buffet', nom_en: 'Breakfast buffet', prix_unitaire_ht: 25, type_tarification: 'par_personne', taux_tva: 0.10 },
      { id: 'p_welcome', nom_fr: 'Apéritif de bienvenue', nom_en: 'Welcome aperitif', prix_unitaire_ht: 1200, type_tarification: 'fixe', taux_tva: 0.20 },
      { id: 'p_dinner', nom_fr: 'Dîner assis 3 plats', nom_en: 'Seated dinner 3-course', prix_unitaire_ht: 85, type_tarification: 'par_personne', taux_tva: 0.10 },
      { id: 'p_brunch', nom_fr: 'Brunch du lendemain', nom_en: 'Next-day brunch', prix_unitaire_ht: 55, type_tarification: 'par_personne', taux_tva: 0.10 },
      { id: 'p_templeset', nom_fr: 'Location Temple cérémonie', nom_en: 'Temple venue rental', prix_unitaire_ht: 3000, type_tarification: 'fixe', taux_tva: 0.20 }
    ];
    saveJSON(LS_KEYS.CATALOGUE, CATALOGUE);
  }
  const pk = loadJSON(LS_KEYS.PACKAGES, null);
  if (!pk) {
    const PACKS = [
      {
        id: 'pack_3j',
        nom_package: 'Mariage 3 jours',
        conditions_paiement: [
          { percent: 30, unit: 'months', value: 6 },
          { percent: 50, unit: 'days', value: 30 },
          { percent: 20, unit: 'days', value: 7 }
        ],
        structure_produits_par_jour: [
          // Chaque jour: lignes { productId, qtyDefault }
          [{ productId: 'p_welcome', qtyDefault: 1 }, { productId: 'p_breakfast', qtyDefault: 1 }],
          [{ productId: 'p_dinner', qtyDefault: 1 }, { productId: 'p_breakfast', qtyDefault: 1 }, { productId: 'p_templeset', qtyDefault: 1 }],
          [{ productId: 'p_brunch', qtyDefault: 1 }]
        ]
      }
    ];
    saveJSON(LS_KEYS.PACKAGES, PACKS);
  }
  if (!loadJSON(LS_KEYS.QUOTES, null)) saveJSON(LS_KEYS.QUOTES, []);
}

/* Views navigation */
function switchView(id) {
  $$('.view').forEach(v => v.classList.remove('visible'));
  $('#view-' + id).classList.add('visible');
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  $(`.nav-btn[data-view="${id}"]`).classList.add('active');
}

/* Back-Office: Products CRUD */
function renderProductsTable() {
  const tbody = $('#productsTable tbody');
  tbody.innerHTML = '';
  const items = loadJSON(LS_KEYS.CATALOGUE, []);
  for (const p of items) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.nom_fr}</td>
      <td>${p.nom_en}</td>
      <td>${fmt(p.prix_unitaire_ht)}</td>
      <td>${p.type_tarification}</td>
      <td>${(p.taux_tva*100).toFixed(0)}%</td>
      <td class="actions">
        <button class="btn subtle" data-edit="${p.id}">Modifier</button>
        <button class="btn danger" data-del="${p.id}">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
  tbody.addEventListener('click', e => {
    const id = e.target.getAttribute('data-edit');
    if (id) {
      const p = items.find(x => x.id === id);
      const f = $('#productForm');
      f.id.value = p.id;
      f.nom_fr.value = p.nom_fr;
      f.nom_en.value = p.nom_en;
      f.prix_unitaire_ht.value = p.prix_unitaire_ht;
      f.type_tarification.value = p.type_tarification;
      f.taux_tva.value = p.taux_tva;
    }
    const del = e.target.getAttribute('data-del');
    if (del) {
      saveJSON(LS_KEYS.CATALOGUE, items.filter(x => x.id !== del));
      renderProductsTable(); renderProductsOptions(); // also refresh selects
    }
  }, { once: true });
}

function handleProductForm() {
  const f = $('#productForm');
  $('#resetProduct').addEventListener('click', () => f.id.value = '');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f).entries());
    const items = loadJSON(LS_KEYS.CATALOGUE, []);
    const item = {
      id: data.id || uid('p_'),
      nom_fr: data.nom_fr.trim(),
      nom_en: data.nom_en.trim(),
      prix_unitaire_ht: parseNum(data.prix_unitaire_ht),
      type_tarification: data.type_tarification,
      taux_tva: parseNum(data.taux_tva)
    };
    const idx = items.findIndex(x => x.id === data.id);
    if (idx >= 0) items[idx] = item; else items.push(item);
    saveJSON(LS_KEYS.CATALOGUE, items);
    f.reset(); f.id.value = '';
    renderProductsTable(); renderProductsOptions();
  });
}

/* Back-Office: Packages CRUD */
function addPaymentRow(container, pay={ percent:30, unit:'days', value:30 }) {
  const tpl = $('#tpl-payment').content.cloneNode(true);
  tpl.querySelector('.pay-percent').value = pay.percent;
  tpl.querySelector('.pay-unit').value = pay.unit;
  tpl.querySelector('.pay-value').value = pay.value;
  tpl.querySelector('.remove-payment').addEventListener('click', e => e.currentTarget.parentElement.remove());
  container.appendChild(tpl);
}

function renderDaysBuilder(duration=3) {
  const daysWrap = $('#daysBuilder');
  daysWrap.innerHTML = '';
  const cat = loadJSON(LS_KEYS.CATALOGUE, []);
  for (let d=1; d<=duration; d++) {
    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="day-title">Jour ${d}</div>
      <div class="day-products" data-day="${d}"></div>
      <button class="btn subtle add-line" type="button">Ajouter un produit</button>
    `;
    const prodWrap = card.querySelector('.day-products');
    const addBtn = card.querySelector('.add-line');
    addBtn.addEventListener('click', () => {
      const line = $('#tpl-day-line').content.cloneNode(true);
      const sel = line.querySelector('.line-product');
      sel.innerHTML = `<option value="">— Sélectionner —</option>` + cat.map(p => `<option value="${p.id}">${p.nom_fr} · ${p.type_tarification}</option>`).join('');
      const tp = line.querySelector('.line-type');
      const tv = line.querySelector('.line-vat');
      sel.addEventListener('change', () => {
        const p = cat.find(x => x.id === sel.value);
        tp.textContent = p ? p.type_tarification : '';
        tp.className = 'line-type badge ' + (p?.type_tarification==='par_personne'?'ok':'');
        tv.textContent = p ? `${(p.taux_tva*100).toFixed(0)}%` : '';
        tv.className = 'line-vat badge ' + (p?.taux_tva===0? 'tax0': p?.taux_tva===0.1? 'tax10':'tax20');
      });
      line.querySelector('.remove-line').addEventListener('click', e => e.currentTarget.parentElement.remove());
      prodWrap.appendChild(line);
    });
    daysWrap.appendChild(card);
  }
}

function handlePackageForm() {
  const f = $('#packageForm');
  const payments = $('#paymentsList');
  const duration = $('#packageDuration');

  $('#addPayment').addEventListener('click', () => addPaymentRow(payments));
  $('#buildDays').addEventListener('click', () => renderDaysBuilder(Math.min(15, Math.max(1, parseInt(duration.value||'3',10)))));

  $('#resetPackage').addEventListener('click', () => {
    f.id.value = '';
    payments.innerHTML = '';
    renderDaysBuilder(3);
  });

  f.addEventListener('submit', e => {
    e.preventDefault();
    const items = loadJSON(LS_KEYS.PACKAGES, []);
    const id = f.id.value || uid('pack_');
    const nom_package = f.nom_package.value.trim();

    // collect payments
    const conds = [];
    $$('.payment-row', payments).forEach(row => {
      conds.push({
        percent: parseNum($('.pay-percent', row).value, 0),
        unit: $('.pay-unit', row).value,
        value: parseNum($('.pay-value', row).value, 0)
      });
    });

    // collect structure per day
    const struct = [];
    $$('.day-products').forEach(dayWrap => {
      const dayLines = [];
      $$('.day-line', dayWrap).forEach(line => {
        const productId = $('.line-product', line).value;
        if (!productId) return;
        const qtyDefault = Math.max(0, parseInt($('.line-qty', line).value||'1',10));
        dayLines.push({ productId, qtyDefault });
      });
      struct.push(dayLines);
    });

    const pack = { id, nom_package, conditions_paiement: conds, structure_produits_par_jour: struct };
    const idx = items.findIndex(x => x.id === id);
    if (idx >= 0) items[idx] = pack; else items.push(pack);
    saveJSON(LS_KEYS.PACKAGES, items);
    f.reset(); f.id.value = ''; payments.innerHTML = ''; renderDaysBuilder(3);
    renderPackagesTable(); populatePackagesSelect();
  });

  // init defaults
  addPaymentRow(payments, { percent:30, unit:'months', value:6 });
  addPaymentRow(payments, { percent:50, unit:'days', value:30 });
  addPaymentRow(payments, { percent:20, unit:'days', value:7 });
  renderDaysBuilder(3);
}

function renderPackagesTable() {
  const tbody = $('#packagesTable tbody');
  tbody.innerHTML = '';
  const items = loadJSON(LS_KEYS.PACKAGES, []);
  for (const p of items) {
    const tr = document.createElement('tr');
    const cond = p.conditions_paiement.map(c => `${c.percent}% ${c.unit==='days'? 'à':'à'} ${c.value} ${c.unit==='days'?'jours':'mois'}`).join(' · ');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.nom_package}</td>
      <td>${cond}</td>
      <td>${p.structure_produits_par_jour.length} j</td>
      <td class="actions">
        <button class="btn subtle" data-edit="${p.id}">Modifier</button>
        <button class="btn danger" data-del="${p.id}">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
  tbody.addEventListener('click', e => {
    const id = e.target.getAttribute('data-edit');
    const itemsNow = loadJSON(LS_KEYS.PACKAGES, []);
    if (id) {
      const pack = itemsNow.find(x => x.id === id);
      const f = $('#packageForm');
      f.id.value = pack.id;
      f.nom_package.value = pack.nom_package;
      const payments = $('#paymentsList');
      payments.innerHTML = '';
      pack.conditions_paiement.forEach(c => addPaymentRow(payments, c));
      const dur = pack.structure_produits_par_jour.length || 1;
      $('#packageDuration').value = dur;
      renderDaysBuilder(dur);
      // load lines
      const cat = loadJSON(LS_KEYS.CATALOGUE, []);
      pack.structure_produits_par_jour.forEach((day, idx) => {
        const dayWrap = $$('.day-products')[idx];
        dayWrap.innerHTML = '';
        day.forEach(l => {
          const line = $('#tpl-day-line').content.cloneNode(true);
          const sel = line.querySelector('.line-product');
          sel.innerHTML = `<option value="">— Sélectionner —</option>` + cat.map(p => `<option value="${p.id}">${p.nom_fr} · ${p.type_tarification}</option>`).join('');
          sel.value = l.productId;
          const prod = cat.find(x => x.id === l.productId);
          const tp = line.querySelector('.line-type');
          const tv = line.querySelector('.line-vat');
          tp.textContent = prod.type_tarification;
          tp.className = 'line-type badge ' + (prod.type_tarification==='par_personne'?'ok':'');
          tv.textContent = `${(prod.taux_tva*100).toFixed(0)}%`;
          tv.className = 'line-vat badge ' + (prod.taux_tva===0? 'tax0': prod.taux_tva===0.1? 'tax10':'tax20');
          line.querySelector('.line-qty').value = l.qtyDefault ?? 1;
          line.querySelector('.remove-line').addEventListener('click', ev => ev.currentTarget.parentElement.remove());
          dayWrap.appendChild(line);
        });
      });
    }
    const del = e.target.getAttribute('data-del');
    if (del) {
      saveJSON(LS_KEYS.PACKAGES, itemsNow.filter(x => x.id !== del));
      renderPackagesTable(); populatePackagesSelect();
    }
  }, { once: true });
}

/* Builder: structure and calculations */
function populatePackagesSelect() {
  const sel = $('#quotePackage');
  const items = loadJSON(LS_KEYS.PACKAGES, []);
  sel.innerHTML = `<option value="">— Optionnel —</option>` + items.map(p => `<option value="${p.id}">${p.nom_package}</option>`).join('');
}

function renderProductsOptions() {
  // used by back-office builders only; builder uses dynamic UI
  // kept for future extension if needed
}

function daysBetween(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  const ms = b - a;
  const days = Math.floor(ms / (1000*60*60*24)) + 1; // inclusive days
  return Math.min(15, Math.max(1, days));
}
function nightsBetween(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  const ms = b - a;
  const nights = Math.max(0, Math.round(ms / (1000*60*60*24)));
  return Math.min(15, Math.max(0, nights));
}

function buildDaysEditor() {
  const f = $('#quoteForm');
  const name = f.Nom_Client.value.trim();
  const lang = f.Langue.value;
  const start = f.Date_Debut.value;
  const end = f.Date_Fin.value;
  if (!name || !start || !end) { alert('Champs manquants'); return; }
  const D = daysBetween(start, end);
  const nights = nightsBetween(start, end);
  const container = $('#daysEditorInner');
  container.innerHTML = '';

  // Pre-fill from package if any
  const pack = loadJSON(LS_KEYS.PACKAGES, []).find(x => x.id === f.Nom_Package_Choisi.value);
  const cat = loadJSON(LS_KEYS.CATALOGUE, []);
  for (let i=0;i<D;i++) {
    const card = document.createElement('div');
    card.className = 'day-editor-card';
    card.innerHTML = `
      <div class="day-editor-title">
        <div>${i18n[lang].day(i+1)} · ${i18n[lang].nights(nights)}</div>
        <div class="actions">
          <button class="btn subtle add-line" type="button">Ajouter un produit</button>
        </div>
      </div>
      <div class="day-editor-lines" data-day="${i+1}"></div>
    `;
    const linesWrap = $('.day-editor-lines', card);
    const add = $('.add-line', card);
    const addLine = (pid, qty) => {
      const line = $('#tpl-day-line').content.cloneNode(true);
      const sel = line.querySelector('.line-product');
      sel.innerHTML = `<option value="">— Sélectionner —</option>` + cat.map(p => `<option value="${p.id}">${lang==='fr'?p.nom_fr:p.nom_en} · ${p.type_tarification} · ${fmt(p.prix_unitaire_ht)}€ HT</option>`).join('');
      if (pid) sel.value = pid;
      const qtyInput = line.querySelector('.line-qty');
      qtyInput.value = qty ?? 1;
      const tp = line.querySelector('.line-type');
      const tv = line.querySelector('.line-vat');
      const refreshBadges = () => {
        const prod = cat.find(x => x.id === sel.value);
        tp.textContent = prod ? prod.type_tarification : '';
        tp.className = 'line-type badge ' + (prod?.type_tarification==='par_personne'?'ok':'');
        tv.textContent = prod ? `${(prod.taux_tva*100).toFixed(0)}%` : '';
        tv.className = 'line-vat badge ' + (prod?.taux_tva===0? 'tax0': prod?.taux_tva===0.1? 'tax10':'tax20');
      };
      sel.addEventListener('change', () => { refreshBadges(); computeQuote(); });
      qtyInput.addEventListener('input', () => computeQuote());
      line.querySelector('.remove-line').addEventListener('click', e => { e.currentTarget.parentElement.remove(); computeQuote(); });
      refreshBadges();
      linesWrap.appendChild(line);
    };
    add.addEventListener('click', () => addLine());
    // Seed with package defaults if provided
    if (pack && pack.structure_produits_par_jour[i]) {
      for (const l of pack.structure_produits_par_jour[i]) addLine(l.productId, l.qtyDefault);
    }
    container.appendChild(card);
  }
  computeQuote();
}

/* Calculation engine */
function computeQuote() {
  const f = $('#quoteForm');
  const lang = f.Langue.value;
  const start = f.Date_Debut.value, end = f.Date_Fin.value;
  const nights = nightsBetween(start, end);
  const pax = parseInt($('#quotePax').value||'0',10);
  const cat = loadJSON(LS_KEYS.CATALOGUE, []);
  const pack = loadJSON(LS_KEYS.PACKAGES, []).find(x => x.id === f.Nom_Package_Choisi.value);

  const detailDays = []; // per day: lines [{prod, qty, baseQty, ht, tva, ttc, taux}]
  const taxTotals = { '0':0, '0.10':0, '0.20':0 };
  let totalHT = 0, totalTTC = 0;

  $$('.day-editor-lines').forEach((wrap, dayIdx) => {
    const lines = [];
    $$('.day-line', wrap).forEach(line => {
      const pid = $('.line-product', line).value;
      if (!pid) return;
      const prod = cat.find(x => x.id === pid);
      let qty = Math.max(0, parseInt($('.line-qty', line).value||'0',10));
      let computedQty = qty;

      // apply contextual multipliers
      if (prod.type_tarification === 'par_personne') {
        if (!pax) { /* require pax */ }
        computedQty = qty * (pax || 0);
      } else if (prod.type_tarification === 'par_nuit') {
        computedQty = qty * Math.max(1, nights);
      }

      const ht = prod.prix_unitaire_ht * computedQty;
      const tva = ht * prod.taux_tva;
      const ttc = ht + tva;

      totalHT += ht; totalTTC += ttc;
      taxTotals[prod.taux_tva.toFixed(2)] += tva;

      lines.push({
        prodId: prod.id,
        name: lang==='fr'? prod.nom_fr : prod.nom_en,
        type: prod.type_tarification,
        qtyRequested: qty,
        qtyComputed: computedQty,
        unitHT: prod.prix_unitaire_ht,
        taux: prod.taux_tva,
        ht, tva, ttc
      });
    });
    detailDays.push(lines);
  });

  // Render summary
  const host = $('#quoteSummary');
  host.innerHTML = '';
  const left = document.createElement('div');
  left.className = 'summary-card';
  left.innerHTML = `<h3>Détail par jour</h3>`;
  detailDays.forEach((lines, i) => {
    const day = document.createElement('div');
    day.className = 'day-card';
    day.innerHTML = `<div class="day-title">${i18n[lang].day(i+1)}</div>`;
    if (!lines.length) day.innerHTML += `<div class="muted">Aucun produit</div>`;
    lines.forEach(l => {
      const badgeType = l.type==='par_personne' ? i18n[lang].perPerson : l.type==='par_nuit' ? i18n[lang].perNight : i18n[lang].fixed;
      const taxClass = l.taux===0? 'tax0' : l.taux===0.1? 'tax10':'tax20';
      day.innerHTML += `
        <div class="inline" style="justify-content:space-between">
          <div>${l.name} <span class="badge ${taxClass}">${(l.taux*100).toFixed(0)}%</span> <span class="badge">${badgeType}</span></div>
          <div>${l.qtyComputed} × ${fmt(l.unitHT)}€ = <strong>${fmt(l.ht)}€ HT</strong> · ${fmt(l.ttc)}€ TTC</div>
        </div>
      `;
    });
    left.appendChild(day);
  });

  const right = document.createElement('div');
  right.className = 'summary-card';
  const taxChips = Object.entries(taxTotals).map(([k,v]) => `<span class="tax-chip">${i18n[lang].vat} ${parseFloat(k)*100}% · ${fmt(v)}€</span>`).join(' ');
  right.innerHTML = `
    <h3>Totaux</h3>
    <div class="kpis">
      <div class="kpi"><div>${i18n[lang].totalHT}</div><div style="font-weight:700">${fmt(totalHT)}€</div></div>
      <div class="kpi"><div>Total TVA</div><div style="font-weight:700">${fmt(taxTotals['0']+taxTotals['0.10']+taxTotals['0.20'])}€</div></div>
      <div class="kpi"><div>${i18n[lang].totalTTC}</div><div style="font-weight:700">${fmt(totalTTC)}€</div></div>
    </div>
    <div class="taxes" style="margin-top:10px">${taxChips}</div>
  `;

  const wrap = document.createElement('div');
  wrap.className = 'summary';
  wrap.appendChild(left);
  wrap.appendChild(right);
  host.appendChild(wrap);

  // attach computed memo to form for saving
  host.dataset.totalHT = String(totalHT);
  host.dataset.totalTTC = String(totalTTC);
  host.dataset.tax0 = String(taxTotals['0']);
  host.dataset.tax10 = String(taxTotals['0.10']);
  host.dataset.tax20 = String(taxTotals['0.20']);
  host.dataset.detail = JSON.stringify(detailDays);
  host.dataset.nights = String(nights);
  host.dataset.start = start;
  host.dataset.end = end;

  // store pack payments for later viewer
  host.dataset.payments = pack ? JSON.stringify(pack.conditions_paiement) : JSON.stringify([]);
}

/* Save quote and generate client link */
function saveQuote() {
  const f = $('#quoteForm');
  const summary = $('#quoteSummary');
  if (!summary.dataset.detail) { alert('Construire la structure avant'); return; }
  const quoteId = uid('q_');
  const payload = {
    id: quoteId,
    Nom_Client: f.Nom_Client.value.trim(),
    Langue: f.Langue.value,
    Date_Debut: f.Date_Debut.value,
    Date_Fin: f.Date_Fin.value,
    Nom_Package_Choisi: f.Nom_Package_Choisi.value || null,
    Nombre_Personnes: parseInt($('#quotePax').value||'0',10),
    Date_Expiration_Devis: f.Date_Expiration_Devis.value,
    Terms_Generales: $('#termsGeneral').value,
    Terms_Particulieres: $('#termsCustom').value,
    Totaux: {
      HT: parseNum(summary.dataset.totalHT),
      TVA_0: parseNum(summary.dataset.tax0),
      TVA_10: parseNum(summary.dataset.tax10),
      TVA_20: parseNum(summary.dataset.tax20),
      TTC: parseNum(summary.dataset.totalTTC)
    },
    Detail: JSON.parse(summary.dataset.detail),
    Payments: JSON.parse(summary.dataset.payments || '[]'),
    Status: 'draft',
    createdAt: new Date().toISOString()
  };
  const all = loadJSON(LS_KEYS.QUOTES, []);
  all.push(payload); saveJSON(LS_KEYS.QUOTES, all);

  const link = `${location.origin}${location.pathname}#view/${quoteId}`;
  alert(`Lien client généré:\n${link}`);
  // Also show in viewer tab
  $('#viewerId').value = quoteId;
  switchView('viewer');
  loadQuoteById(quoteId);
}

/* Viewer */
function computeDueDate(startISO, unit, value) {
  const d = new Date(startISO);
  if (unit === 'days') {
    d.setDate(d.getDate() - value);
  } else {
    d.setMonth(d.getMonth() - value);
  }
  return d;
}

function loadQuoteById(id) {
  const q = loadJSON(LS_KEYS.QUOTES, []).find(x => x.id === id);
  const host = $('#clientQuote');
  host.innerHTML = '';
  if (!q) {
    host.innerHTML = `<div class="muted">Devis introuvable</div>`;
    return;
  }
  const lang = q.Langue || 'fr';
  const txt = i18n[lang];

  const header = document.createElement('div');
  header.className = 'stack';
  header.innerHTML = `
    <h2>${q.Nom_Client}</h2>
    <div class="meta">${new Date(q.Date_Debut).toLocaleDateString()} → ${new Date(q.Date_Fin).toLocaleDateString()}</div>
    <div class="meta">${txt.package}: ${q.Nom_Package_Choisi || '—'}</div>
    <div class="meta">${txt.expiration}: ${new Date(q.Date_Expiration_Devis).toLocaleDateString()}</div>
  `;
  host.appendChild(header);

  const dayWrap = document.createElement('div');
  dayWrap.className = 'stack';
  const cat = loadJSON(LS_KEYS.CATALOGUE, []);
  q.Detail.forEach((lines, i) => {
    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `<div class="day-title">${txt.day(i+1)}</div>`;
    if (!lines.length) card.innerHTML += `<div class="muted">${lang==='fr'?'Aucun produit':'No items'}</div>`;
    lines.forEach(l => {
      const taxClass = l.taux===0? 'tax0' : l.taux===0.1? 'tax10':'tax20';
      card.innerHTML += `
        <div class="inline" style="justify-content:space-between">
          <div>${l.name} <span class="badge ${taxClass}">${(l.taux*100).toFixed(0)}%</span></div>
          <div>${fmt(l.ttc)}€ TTC</div>
        </div>
      `;
    });
    dayWrap.appendChild(card);
  });
  host.appendChild(dayWrap);

  const totals = document.createElement('div');
  totals.className = 'totals';
  const tvatot = q.Totaux.TVA_0 + q.Totaux.TVA_10 + q.Totaux.TVA_20;
  totals.innerHTML = `
    <div class="total-box"><div>${txt.totalHT}</div><div style="font-weight:700">${fmt(q.Totaux.HT)}€</div></div>
    <div class="total-box"><div>${txt.vat}</div><div style="font-weight:700">${fmt(tvatot)}€</div></div>
    <div class="total-box"><div>${txt.totalTTC}</div><div style="font-weight:700">${fmt(q.Totaux.TTC)}€</div></div>
  `;
  host.appendChild(totals);

  // Payment schedule
  const sched = document.createElement('div');
  sched.className = 'summary-card';
  sched.innerHTML = `<h3>${lang==='fr'?'Calendrier des paiements':'Payment schedule'}</h3>`;
  const list = document.createElement('div'); list.className = 'pay-schedule';
  q.Payments.forEach(p => {
    const due = computeDueDate(q.Date_Debut, p.unit, p.value);
    const amount = q.Totaux.TTC * (p.percent/100);
    const line = document.createElement('div');
    line.className = 'pay-line';
    line.innerHTML = `
      <div>${p.percent}%</div>
      <div>${lang==='fr'?(p.unit==='days'?'jours':'mois'):(p.unit==='days'?'days':'months')} avant</div>
      <div>${due.toLocaleDateString()}</div>
      <div class="pay-amount">${fmt(amount)}€ TTC</div>
    `;
    list.appendChild(line);
  });
  sched.appendChild(list);
  host.appendChild(sched);

  // Terms
  const terms = document.createElement('div');
  terms.className = 'summary-card';
  terms.innerHTML = `
    <h3>${lang==='fr'?'Conditions':'Terms & Conditions'}</h3>
    <div class="stack">
      <div><strong>${lang==='fr'?'T&C générales':'General T&C'}</strong><p>${q.Terms_Generales || '—'}</p></div>
      <div><strong>${lang==='fr'?'Conditions particulières':'Special conditions'}</strong><p>${q.Terms_Particulieres || '—'}</p></div>
    </div>
  `;
  host.appendChild(terms);

  const actions = document.createElement('div');
  actions.className = 'actions end';
  const btn = document.createElement('button');
  btn.className = 'btn primary';
  btn.textContent = txt.accept;
  btn.addEventListener('click', () => {
    const all = loadJSON(LS_KEYS.QUOTES, []);
    const idx = all.findIndex(x => x.id === q.id);
    if (idx >= 0) {
      all[idx].Status = 'accepted';
      all[idx].acceptedAt = new Date().toISOString();
      saveJSON(LS_KEYS.QUOTES, all);
      alert(txt.accepted);
      console.log(`[NOTIFY] Devis accepté · ${q.id} · Client ${q.Nom_Client}`);
      loadQuoteById(q.id);
    }
  });
  actions.appendChild(btn);
  if (q.Status === 'accepted') {
    const badge = document.createElement('span');
    badge.className = 'badge ok';
    badge.textContent = lang==='fr'?'Statut: accepté':'Status: accepted';
    actions.appendChild(badge);
  }
  host.appendChild(actions);
}

/* Hash router for viewer links */
function handleHashRoute() {
  const h = location.hash;
  if (h.startsWith('#view/')) {
    const id = h.split('/')[1];
    switchView('viewer');
    $('#viewerId').value = id;
    loadQuoteById(id);
  }
}

/* UI language switch (UI labels only) */
$('#uiLang').addEventListener('change', e => {
  const l = e.target.value;
  document.documentElement.lang = l;
  $('#subtitle').textContent = l==='fr' ? 'Gestion des devis · Mariages & Événements' : 'Quote management · Weddings & Events';
});

/* Nav buttons */
$$('.nav-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));

/* Back-office init */
function initBackOffice() {
  renderProductsTable();
  handleProductForm();
  renderPackagesTable();
  handlePackageForm();
}

/* Builder init */
function initBuilder() {
  populatePackagesSelect();
  $('#buildStructure').addEventListener('click', e => { e.preventDefault(); buildDaysEditor(); });
  $('#daysEditorInner').addEventListener('input', computeQuote);
  $('#saveQuote').addEventListener('click', e => { e.preventDefault(); computeQuote(); saveQuote(); });
}

/* Viewer init */
$('#loadQuote').addEventListener('click', () => loadQuoteById($('#viewerId').value.trim()));

/* Boot */
ensureSeeds();
initBackOffice();
initBuilder();
handleHashRoute();
window.addEventListener('hashchange', handleHashRoute);
