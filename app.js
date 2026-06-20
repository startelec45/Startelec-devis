/* ============================================
   STARTELEC DEVIS — app.js
   Base de données locale + utilitaires
   ============================================ */

// ══════════════════════════════════════════════
// CONFIGURATION PAR DÉFAUT
// (Modifiez vos vraies informations via la page Réglages de l'application)
// ══════════════════════════════════════════════
const CONFIG = {
  entreprise: {
    nom: 'StarElec',
    siret: '000 000 000 00000',
    iban: 'FR76 XXXX XXXX XXXX XXXX XXXX XXX',
    bic: 'XXXXXXXXXXX',
    banque: 'Votre Banque',
    adresse: 'Votre adresse',
    cp: '45000',
    ville: 'Orléans',
    pays: 'France',
    email: 'contact@votre-email.com',
    tel: '06 00 00 00 00',
    tva_msg: 'TVA non applicable, article 293B du CGI. Régime micro-entrepreneur.',
    vendeur: 'Florian Fernandes',
    lieu: 'Orléans',
  },
  devis: {
    validite_jours: 30,
    acompte_pct: 30,
    taux_horaire_mo: 46.00,
    prefix_devis: 'D',
    prefix_facture: 'F',
    prefix_acompte: 'FA',
  }
};

// ══════════════════════════════════════════════
// BASE DE DONNÉES LOCALE (localStorage)
// ══════════════════════════════════════════════
const DB = {

  // ── DEVIS ──
  getDevis() {
    try { return JSON.parse(localStorage.getItem('se_devis') || '[]'); }
    catch (e) { return []; }
  },

  saveDevis(list) {
    localStorage.setItem('se_devis', JSON.stringify(list));
  },

  getDevisById(id) {
    return this.getDevis().find(d => d.id === id) || null;
  },

  addDevis(devis) {
    const list = this.getDevis();
    devis.id = devis.id || genId();
    devis.created_at = new Date().toISOString();
    devis.updated_at = new Date().toISOString();
    list.unshift(devis);
    this.saveDevis(list);
    return devis;
  },

  updateDevis(id, data) {
    const list = this.getDevis();
    const idx = list.findIndex(d => d.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
    this.saveDevis(list);
    return list[idx];
  },

  updateStatut(id, statut) {
    return this.updateDevis(id, { statut });
  },

  deleteDevis(id) {
    const list = this.getDevis().filter(d => d.id !== id);
    this.saveDevis(list);
  },

  // ── NUMÉROTATION AUTOMATIQUE ──
  getNextNumero(type = 'devis') {
    const list = this.getDevis();
    const annee = new Date().getFullYear();
    const prefix = type === 'facture' ? CONFIG.devis.prefix_facture
      : type === 'acompte' ? CONFIG.devis.prefix_acompte
        : CONFIG.devis.prefix_devis;
    const pattern = `${prefix}${annee}/`;

    const nums = list
      .filter(d => d.numero && d.numero.startsWith(pattern))
      .map(d => parseInt(d.numero.replace(pattern, '')) || 0);

    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${pattern}${String(next).padStart(3, '0')}`;
  },

  // ── CLIENTS ──
  getClients() {
    try { return JSON.parse(localStorage.getItem('se_clients') || '[]'); }
    catch (e) { return []; }
  },

  saveClients(list) {
    localStorage.setItem('se_clients', JSON.stringify(list));
  },

  getClientById(id) {
    return this.getClients().find(c => c.id === id) || null;
  },

  addClient(client) {
    const list = this.getClients();
    client.id = client.id || genId();
    client.created_at = new Date().toISOString();
    list.unshift(client);
    this.saveClients(list);
    return client;
  },

  updateClient(id, data) {
    const list = this.getClients();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this.saveClients(list);
    return list[idx];
  },

  deleteClient(id) {
    const list = this.getClients().filter(c => c.id !== id);
    this.saveClients(list);
  },

  // ── CATALOGUE PRESTATIONS ──
  getCatalogue() {
    try {
      const saved = localStorage.getItem('se_catalogue');
      if (saved) return JSON.parse(saved);
      return DEFAULT_CATALOGUE;
    } catch (e) { return DEFAULT_CATALOGUE; }
  },

  saveCatalogue(list) {
    localStorage.setItem('se_catalogue', JSON.stringify(list));
  },

  addPrestation(p) {
    const list = this.getCatalogue();
    p.id = p.id || genId();
    list.push(p);
    this.saveCatalogue(list);
    return p;
  },

  updatePrestation(id, data) {
    const list = this.getCatalogue();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data };
    this.saveCatalogue(list);
    return list[idx];
  },

  deletePrestation(id) {
    const list = this.getCatalogue().filter(p => p.id !== id);
    this.saveCatalogue(list);
  },

  // ── RÉGLAGES ──
  getConfig() {
    try {
      const saved = localStorage.getItem('se_config');
      return saved ? { ...CONFIG, ...JSON.parse(saved) } : CONFIG;
    } catch (e) { return CONFIG; }
  },

  saveConfig(data) {
    localStorage.setItem('se_config', JSON.stringify(data));
  },

  // ── FACTURES LIÉES ──
  getFactures() {
    try { return JSON.parse(localStorage.getItem('se_factures') || '[]'); }
    catch (e) { return []; }
  },

  saveFactures(list) {
    localStorage.setItem('se_factures', JSON.stringify(list));
  },

  addFacture(facture) {
    const list = this.getFactures();
    facture.id = facture.id || genId();
    facture.created_at = new Date().toISOString();
    list.unshift(facture);
    this.saveFactures(list);
    // Mettre à jour deja_facture sur le devis lié
    if (facture.devis_id) {
      const d = this.getDevisById(facture.devis_id);
      if (d) {
        const total_fact = list
          .filter(f => f.devis_id === facture.devis_id)
          .reduce((s, f) => s + (f.montant || 0), 0);
        this.updateDevis(facture.devis_id, { deja_facture: total_fact });
      }
    }
    return facture;
  },

  getFacturesByDevis(devis_id) {
    return this.getFactures().filter(f => f.devis_id === devis_id);
  },
};

// ══════════════════════════════════════════════
// CATALOGUE PAR DÉFAUT
// ══════════════════════════════════════════════
const DEFAULT_CATALOGUE = [
  { id: 'cat-01', categorie: 'Appareillage', designation: 'Prise de courant', description: "Câbles + pot d'encastrement + mécanisme. Forfait prêt à brancher.", pu: 80.00, unite: 'u' },
  { id: 'cat-02', categorie: 'Appareillage', designation: 'Prise 20A (four / lave-linge)', description: "Câbles + pot + prise spécialisée 20A. Forfait prêt à brancher.", pu: 135.00, unite: 'u' },
  { id: 'cat-03', categorie: 'Appareillage', designation: 'Plaque de cuisson (32A)', description: "Câbles + alimentation dédiée grande puissance.", pu: 190.00, unite: 'u' },
  { id: 'cat-04', categorie: 'Éclairage', designation: 'Simple allumage', description: "Câbles + pot + interrupteur simple. Forfait prêt à brancher.", pu: 90.00, unite: 'u' },
  { id: 'cat-05', categorie: 'Éclairage', designation: 'Va-et-vient', description: "Câbles + pot + mécanisme va-et-vient complet.", pu: 160.00, unite: 'u' },
  { id: 'cat-06', categorie: 'Éclairage', designation: 'Bouton-poussoir', description: "Câbles + pot + appareillage complet avec télérupteur.", pu: 145.00, unite: 'u' },
  { id: 'cat-07', categorie: 'Alimentation', designation: 'Alimentation directe', description: "Câbles + alimentation directe (hors tableau).", pu: 70.00, unite: 'u' },
  { id: 'cat-08', categorie: 'Alimentation', designation: 'Alimentation directe VMC', description: "Câbles + alimentation dédiée VMC.", pu: 70.00, unite: 'u' },
  { id: 'cat-09', categorie: 'Chauffage', designation: 'Ligne radiateur', description: "Câbles + alimentation radiateur (sans fourniture appareil).", pu: 90.00, unite: 'u' },
  { id: 'cat-10', categorie: 'Alimentation', designation: 'Ballon eau chaude (BECS)', description: "Câbles + alimentation ballon eau chaude sanitaire.", pu: 150.00, unite: 'u' },
  { id: 'cat-11', categorie: 'Réseau', designation: 'Ligne réseau RJ45', description: "Câbles + prise RJ45 encastrée.", pu: 120.00, unite: 'u' },
  { id: 'cat-12', categorie: 'Main d\'œuvre', designation: 'Main d\'œuvre', description: "Taux horaire main d'œuvre électricité.", pu: 46.00, unite: 'h' },
];

// ══════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function fmt(n) {
  if (isNaN(n)) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2
  }).format(n);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR');
}

function fmtDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toISOString().split('T')[0];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function initiales(nom) {
  if (!nom) return '?';
  return nom.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 2);
}

function getUrlParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ── TOAST ──
function toast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: 'ti-check', error: 'ti-alert-circle', info: 'ti-info-circle' };
  el.innerHTML = `<i class="ti ${icons[type] || 'ti-info-circle'}"></i> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ── DROPDOWNS ──
function toggleDropdown(btn) {
  const dropdown = btn.closest('.dropdown');
  const wasOpen = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!wasOpen) {
    dropdown.classList.add('open');
    document.getElementById('overlay').style.display = 'block';
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
  const ov = document.getElementById('overlay');
  if (ov) ov.style.display = 'none';
}

// ── CALCULS DEVIS ──
function calculerLigne(ligne) {
  const qte = parseFloat(ligne.qte) || 0;
  const pu = parseFloat(ligne.pu) || 0;
  return Math.round(qte * pu * 100) / 100;
}

function calculerTotaux(lignes) {
  const total_ht = lignes.reduce((s, l) => s + (l.total || calculerLigne(l)), 0);
  const acompte = Math.round(total_ht * (CONFIG.devis.acompte_pct / 100) * 100) / 100;
  return { total_ht, total_ttc: total_ht, acompte };
}

// ── AUTOCOMPLÉTION CATALOGUE ──
function setupAutocomplete(input, onSelect) {
  const wrap = input.closest('.autocomplete-wrap');
  if (!wrap) return;

  let list = wrap.querySelector('.autocomplete-list');
  if (!list) {
    list = document.createElement('div');
    list.className = 'autocomplete-list';
    wrap.appendChild(list);
  }

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q) { list.classList.remove('open'); return; }

    const terms = q.split(' ').filter(t => t.length > 0);
    const catalogue = DB.getCatalogue();
    const matches = catalogue.filter(p => {
      const text = (p.designation + ' ' + (p.categorie || '') + ' ' + (p.description || '')).toLowerCase();
      return terms.every(term => text.includes(term));
    }).slice(0, 8);

    if (!matches.length) { list.classList.remove('open'); return; }

    list.innerHTML = matches.map(p => `
      <div class="autocomplete-item" data-id="${p.id}">
        <span>${p.designation}</span>
        <span class="ac-prix">${fmt(p.pu)} / ${p.unite || 'u'}</span>
      </div>
    `).join('');

    list.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const p = catalogue.find(x => x.id === item.dataset.id);
        if (p) onSelect(p);
        list.classList.remove('open');
      });
    });

    list.classList.add('open');
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) list.classList.remove('open');
  });
}

// ══════════════════════════════════════════════
// GÉNÉRATION PDF — html2pdf (sans popup, 100% client)
// ══════════════════════════════════════════════

// Charge un script externe dynamiquement (une seule fois)
function chargerScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Impossible de charger ' + src));
    document.head.appendChild(s);
  });
}

async function genererPDF(devis_id) {
  const devis = DB.getDevisById(devis_id);
  if (!devis) { toast('Devis introuvable', 'error'); return; }

  // ⚠️ SÉCURITÉ CHROME : html2canvas produit une page blanche si on est en "file://"
  // On utilise window.print() en local, et le VRAI téléchargement direct sur serveur (Netlify)
  if (window.location.protocol === 'file:') {
    toast('Mode local détecté : ouverture de l\'aperçu (utilisez "Enregistrer en PDF")', 'info', 4000);
    window.open(`voir.html?id=${devis_id}&print=1`, '_blank');
    return;
  }

  // ── Téléchargement direct (Pour Netlify / Serveur) ──
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:99998',
    'background:rgba(15,24,32,0.85)',
    'display:flex;flex-direction:column;align-items:center;justify-content:center',
    'color:#fff;font-family:Inter,sans-serif;gap:16px',
  ].join(';');
  overlay.innerHTML = `
    <div style="font-size:18px;font-weight:600">⏳ Génération du PDF en cours…</div>
    <div style="font-size:13px;opacity:.7">Téléchargement direct (Mode Serveur)</div>`;
  document.body.appendChild(overlay);

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;top:0;left:0;width:794px;background:#fff;z-index:99999;overflow:visible';
  wrap.innerHTML = buildPDFHtml(devis, DB.getConfig().entreprise);
  document.body.appendChild(wrap);

  try {
    await chargerScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');

    const opt = {
      margin: 0,
      filename: `${(devis.numero || 'devis').replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    await html2pdf().set(opt).from(wrap).save();
    toast('Fichier PDF téléchargé directement !', 'success');
  } catch (e) {
    console.error('Erreur PDF:', e);
    toast('Erreur lors de la génération', 'error');
  } finally {
    try { wrap.remove(); overlay.remove(); } catch (_) { }
  }
}

// ── Construit le HTML du document PDF ──
function buildPDFHtml(d, cfg) {
  const total_ht = d.montant_ht || 0;
  const acompte_pct = d.acompte_pct || 30;
  const acompte = Math.round(total_ht * acompte_pct / 100 * 100) / 100;

  const clientAdresse = [
    d.client_adresse,
    d.client_cp && d.client_ville ? `${d.client_cp} ${d.client_ville}` : (d.client_cp || d.client_ville),
    d.client_pays && d.client_pays !== 'France' ? d.client_pays : ''
  ].filter(Boolean).join('<br/>');

  const logoSaved = localStorage.getItem('se_logo');
  const logoHTML = logoSaved
    ? `<img src="${logoSaved}" style="height:50px;width:auto" />`
    : `<div style="font-size:20px;font-weight:700;color:#0F1820;letter-spacing:1px">START★ELEC</div>`;

  const lignesHTML = (d.lignes || []).map((l, i) => {
    if (l.type === 'soustotal') return `<tr><td colspan="4" style="font-weight:700;text-align:right;padding:6px 8px;background:#e8e8e8">Sous-total</td><td style="text-align:right;font-weight:700;padding:6px 8px;background:#e8e8e8">${fmt(l.total || 0)}</td></tr>`;
    if (l.type === 'texte') return `<tr><td colspan="5" style="padding:6px 8px;color:#444;font-style:italic">${l.designation || ''}</td></tr>`;
    return `<tr>
      <td style="width:30px;text-align:center;color:#666;padding:6px 8px">${i + 1}</td>
      <td style="padding:6px 8px">
        <strong>${l.designation || ''}</strong>
        ${l.description ? `<div style="font-size:9px;color:#666;margin-top:2px">${l.description}</div>` : ''}
      </td>
      <td style="text-align:center;width:50px;padding:6px 8px">${l.qte || ''}</td>
      <td style="text-align:right;width:80px;padding:6px 8px">${fmt(l.pu || 0)}</td>
      <td style="text-align:right;width:90px;font-weight:600;padding:6px 8px">${fmt(l.total || 0)}</td>
    </tr>`;
  }).join('');

  return `
  <div style="background:#fff;width:794px;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#1A1A1A">

    <!-- HEADER -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px">
      <div>${logoHTML}</div>
      <div style="text-align:right">
        <div style="font-size:26px;font-weight:700;color:#0F1820;line-height:1">${d.type || 'DEVIS'}</div>
        <div style="font-size:11px;color:#666;margin-top:4px">N° ${d.numero || ''}</div>
      </div>
    </div>
    <div style="height:3px;background:#961414"></div>

    <!-- BANDE INFOS -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);background:#F2F2F2;border-bottom:1px solid #D0D0D0">
      <div style="padding:7px 10px;font-size:9px;border-right:1px solid #D0D0D0"><span style="color:#666">Date de création :</span><strong style="display:block;font-size:9.5px">${fmtDate(d.date)}</strong></div>
      <div style="padding:7px 10px;font-size:9px;border-right:1px solid #D0D0D0"><span style="color:#666">Date de validité :</span><strong style="display:block;font-size:9.5px">${fmtDate(d.date_validite)}</strong></div>
      <div style="padding:7px 10px;font-size:9px;border-right:1px solid #D0D0D0"><span style="color:#666">Lieu de création :</span><strong style="display:block;font-size:9.5px">${d.lieu || cfg.lieu}</strong></div>
      <div style="padding:7px 10px;font-size:9px"><span style="color:#666">Vendeur :</span><strong style="display:block;font-size:9.5px">${d.vendeur_nom || cfg.vendeur}</strong></div>
    </div>

    <!-- VENDEUR / ACHETEUR -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:14px 20px">
      <div style="border:1px solid #D0D0D0;border-radius:4px;overflow:hidden">
        <div style="background:#4A4A4A;color:#fff;font-size:9px;font-weight:700;padding:5px 8px;border-bottom:2px solid #961414;text-transform:uppercase">Vendeur</div>
        <div style="padding:8px;background:#F2F2F2;font-size:10px;line-height:1.7">
          <strong>${cfg.nom}</strong><br/>
          ${cfg.adresse}<br/>
          ${cfg.cp} ${cfg.ville}<br/>
          SIRET ${cfg.siret}<br/>
          ${cfg.iban} ${cfg.banque}
        </div>
      </div>
      <div style="border:1px solid #D0D0D0;border-radius:4px;overflow:hidden">
        <div style="background:#4A4A4A;color:#fff;font-size:9px;font-weight:700;padding:5px 8px;border-bottom:2px solid #961414;text-transform:uppercase">Acheteur</div>
        <div style="padding:8px;background:#F2F2F2;font-size:10px;line-height:1.7">
          <strong>${d.client || ''}</strong><br/>
          ${clientAdresse}
          ${d.client_email ? `<br/>${d.client_email}` : ''}
        </div>
      </div>
    </div>

    <!-- MENTION FISCALE -->
    <div style="padding:4px 20px;font-size:8.5px;color:#666;font-style:italic">${cfg.tva_msg || ''}</div>

    <!-- OBJET -->
    ${d.objet ? `<div style="margin:0 20px 10px;background:#F5E8E8;border:1px solid #D0D0D0;border-bottom:2px solid #961414;padding:6px 10px;font-size:10px"><strong>Objet :</strong> ${d.objet}</div>` : ''}

    <!-- TABLEAU -->
    <div style="padding:0 20px 14px">
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead>
          <tr>
            <th style="background:#4A4A4A;color:#fff;padding:7px 8px;text-align:left;font-size:9.5px;border-bottom:2px solid #961414;width:30px">N°</th>
            <th style="background:#4A4A4A;color:#fff;padding:7px 8px;text-align:left;font-size:9.5px;border-bottom:2px solid #961414">DÉSIGNATION</th>
            <th style="background:#4A4A4A;color:#fff;padding:7px 8px;text-align:center;font-size:9.5px;border-bottom:2px solid #961414;width:50px">QTÉ</th>
            <th style="background:#4A4A4A;color:#fff;padding:7px 8px;text-align:right;font-size:9.5px;border-bottom:2px solid #961414;width:80px">PU HT (€)</th>
            <th style="background:#4A4A4A;color:#fff;padding:7px 8px;text-align:right;font-size:9.5px;border-bottom:2px solid #961414;width:90px">TOTAL HT (€)</th>
          </tr>
        </thead>
        <tbody>${lignesHTML}</tbody>
      </table>
    </div>

    <!-- TOTAUX + CONDITIONS -->
    <div style="display:flex;justify-content:flex-end;padding:0 20px 14px;gap:16px;align-items:start">
      <div style="flex:1;font-size:9px;color:#444;line-height:1.6">
        <strong style="color:#961414;font-size:9.5px">Mise en garde / Conditions :</strong><br/>
        ${d.infos_spec || 'Forfait global "Prêt à brancher" incluant : câbles, fournitures, temps de pose. Tableau électrique exclu.'}
      </div>
      <div style="min-width:240px;border:1px solid #D0D0D0;overflow:hidden">
        <div style="display:flex;justify-content:space-between;padding:5px 10px;font-size:10px;border-bottom:1px solid #D0D0D0"><label>Total HT</label><span>${fmt(total_ht)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 10px;font-size:10px;border-bottom:1px solid #D0D0D0"><label>Réduction</label><span>0,00 €</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 10px;font-size:11px;font-weight:700;background:#0F1820;color:#fff;border-top:2px solid #961414"><label>TOTAL À PAYER</label><span>${fmt(total_ht)}</span></div>
      </div>
    </div>

    <!-- RÈGLEMENT -->
    <div style="display:grid;grid-template-columns:1fr 1fr;margin:0 20px 14px;border:1px solid #D0D0D0;overflow:hidden">
      <div style="border-right:1px solid #D0D0D0">
        <div style="background:#F2F2F2;font-weight:700;font-size:9px;padding:5px 10px;border-bottom:2px solid #961414;text-transform:uppercase">Modalités de règlement</div>
        <div style="padding:8px 10px;font-size:9.5px;line-height:1.7">
          Acompte à verser à la commande (${acompte_pct}%) : <strong>${fmt(acompte)}</strong><br/>
          Solde à la fin des travaux.<br/>
          Mode de règlement : ${d.mode_reglement || 'Virement bancaire'}
        </div>
      </div>
      <div>
        <div style="background:#F2F2F2;font-weight:700;font-size:9px;padding:5px 10px;border-bottom:2px solid #961414;text-transform:uppercase">Coordonnées bancaires</div>
        <div style="padding:8px 10px;font-size:9.5px;line-height:1.7">
          Banque : ${cfg.banque}<br/>
          BIC : ${cfg.bic}<br/>
          IBAN : ${cfg.iban}
        </div>
      </div>
    </div>

    <!-- SIGNATURES -->
    <div style="display:grid;grid-template-columns:1fr 1fr;margin:0 20px 14px;border:1px solid #D0D0D0;border-top:2px solid #961414;overflow:hidden">
      <div style="padding:12px 10px 30px;font-size:9.5px;line-height:1.7;border-right:1px solid #D0D0D0">
        <strong>Pour le vendeur : ${d.vendeur_nom || cfg.vendeur}</strong><br/><br/>
        Signature électronique :
      </div>
      <div style="padding:12px 10px 30px;font-size:9.5px;line-height:1.7">
        <strong>Pour le client :</strong><br/>
        Mention manuscrite <em>"Bon pour accord"</em><br/>
        Date et signature :
      </div>
    </div>

    ${d.texte_fin ? `<div style="padding:8px 20px;font-size:9px;color:#444">${d.texte_fin}</div>` : ''}

    <!-- FOOTER -->
    <div style="height:2px;background:#961414;margin:0 20px"></div>
    <div style="padding:6px 20px 12px;font-size:7.5px;color:#666;text-align:center">
      ${cfg.nom} — ${cfg.adresse}, ${cfg.cp} ${cfg.ville} — SIRET ${cfg.siret} — ${cfg.email} — ${cfg.tel}
    </div>

  </div>`;
}

// ══════════════════════════════════════════════
// IA — APPEL MULTI-FOURNISSEURS (Claude / Gemini)
// ══════════════════════════════════════════════
async function appelIA(prompt, contexte = {}) {
  const cfg = DB.getConfig();
  const catalogue = DB.getCatalogue();
  const provider = localStorage.getItem('se_ai_provider') || 'anthropic';
  const apiKey = localStorage.getItem('se_api_key') || '';

  if (!apiKey) throw new Error('Clé API manquante — configurez-la dans les Réglages.');

  // Filtrage intelligent du catalogue pour éviter d'envoyer des milliers de lignes au modèle
  let catalogueFiltre = catalogue;
  if (catalogue.length > 80) {
    const promptWords = (prompt || '').toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(/[\s,.'";()\-+]+/)
      .filter(w => w.length > 2 && !['pour', 'avec', 'dans', 'faire', 'plus', 'tout', 'devis', 'jean', 'dupont', 'rue', 'paix', 'client', 'adresse', 'creer', 'ajouter'].includes(w));

    const scored = catalogue.map(p => {
      const targetText = ((p.designation || '') + ' ' + (p.categorie || '') + ' ' + (p.description || ''))
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let score = 0;
      promptWords.forEach(word => { if (targetText.includes(word)) score += 1.5; });
      return { item: p, score };
    });

    const matches = scored
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.item);

    if (matches.length > 0) {
      const mo = catalogue.find(p => (p.designation || '').toLowerCase().includes("main d'oeuvre") || (p.designation || '').toLowerCase().includes("main d'\u0153uvre"));
      if (mo && !matches.includes(mo)) matches.push(mo);
      catalogueFiltre = matches.slice(0, 80);
    } else {
      catalogueFiltre = catalogue.slice(0, 50);
    }
  }

  const systemPrompt = `Tu es l'assistant de facturation de ${cfg.entreprise.nom}, entreprise d'électricité à ${cfg.entreprise.ville}.
Tu aides à créer des devis professionnels.

CATALOGUE DES PRESTATIONS DISPONIBLES :
${catalogueFiltre.map(p => `- ${p.designation} : ${p.pu}€/${p.unite} — ${p.description}`).join('\n')}

RÈGLES IMPORTANTES :
1. Si l'utilisateur demande une marque (ex: Céliane) : Sélectionne uniquement le matériel du catalogue, sans ajouter de ligne forfaitaire générale.
2. Si générique ("prise de courant") : Choisis le forfait général.
3. Toujours utiliser les prix du catalogue sauf si précisé autrement.
4. IMPORT DE FICHIER (PDF/CSV/Image) : Si un document contenant une liste de matériel avec des prix est fourni :
   - Extrais chaque article pertinent (ignore les lignes de totaux).
   - Calcule le prix de vente (pu) : Prends le prix d'achat HT (Net) et ajoute +50% de marge. 
   - Exception : Si le document affiche un "Prix Public", et qu'il est supérieur au prix d'achat + 50%, tu peux utiliser ce prix public comme prix de vente unitaire.
5. MASQUER LES RÉFÉRENCES : N'inclus JAMAIS les références fournisseurs (les codes alphanumériques) dans la "designation" ou la "description" pour que les clients ne puissent pas aller chercher le matériel sur internet.
6. Répondre en JSON structuré uniquement, respectant le format ci-dessous.

FORMAT DE RÉPONSE JSON :
{
  "client": { "nom": "", "type": "Particulier|Professionnel", "civilite": "M.|Mme|", "prenom": "", "nom_famille": "", "adresse": "", "cp": "", "ville": "", "email": "", "tel": "" },
  "objet": "",
  "lignes": [
    { "designation": "", "description": "", "qte": 1, "pu": 0.00, "unite": "u" }
  ],
  "note": ""
}

Ne réponds JAMAIS en dehors du JSON. Pas de texte avant ou après.`;

  const userPrompt = `${prompt || "Analyse le document ci-joint pour créer le devis."}

${contexte.devisExistant ? `Devis en cours : ${JSON.stringify(contexte.devisExistant)}` : ''}`;

  try {
    let text = '';
    let rawResponseText = '';

    // ── ANTHROPIC (Claude) ──
    if (provider === 'anthropic') {
      const model = localStorage.getItem('se_ai_model') || 'claude-haiku-4-5';

      let contentArray = [];
      if (contexte.file) {
        if (contexte.file.isCsv) {
          contentArray.push({ type: 'text', text: `CONTENU DU FICHIER CSV IMPORTÉ :\n${contexte.file.text}` });
        } else {
          contentArray.push({
            type: contexte.file.mimeType === 'application/pdf' ? 'document' : 'image',
            source: {
              type: 'base64',
              media_type: contexte.file.mimeType,
              data: contexte.file.base64
            }
          });
        }
      }
      contentArray.push({ type: 'text', text: userPrompt });

      let headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      };
      if (contexte.file && contexte.file.mimeType === 'application/pdf') {
        headers['anthropic-beta'] = 'pdfs-2024-09-25';
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model,
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: 'user', content: contentArray }],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        let errMsg = 'Erreur API Anthropic';
        try { const errObj = JSON.parse(errText); errMsg = errObj.error?.message || errMsg; } catch (_) { errMsg = errText || errMsg; }
        throw new Error("API_ERROR: " + errMsg);
      }
      rawResponseText = await res.text();
      let data;
      try { data = JSON.parse(rawResponseText); } catch (parseErr) {
        const err = new SyntaxError("Réponse de l'API Anthropic invalide.");
        err.rawText = rawResponseText;
        throw err;
      }
      text = data.content?.[0]?.text || '';

    // ── GOOGLE GEMINI ──
    } else if (provider === 'gemini') {
      const model = localStorage.getItem('se_ai_model') || 'gemini-2.5-flash';

      let partsArray = [];
      if (contexte.file) {
        if (contexte.file.isCsv) {
          partsArray.push({ text: `CONTENU DU FICHIER CSV IMPORTÉ :\n${contexte.file.text}` });
        } else {
          partsArray.push({ inlineData: { mimeType: contexte.file.mimeType, data: contexte.file.base64 } });
        }
      }
      partsArray.push({ text: userPrompt });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: partsArray }],
            generationConfig: { maxOutputTokens: 1500, temperature: 0.2, responseMimeType: "application/json" },
          }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        let errMsg = 'Erreur API Gemini';
        try { const errObj = JSON.parse(errText); errMsg = errObj.error?.message || errMsg; } catch (_) { errMsg = errText || errMsg; }
        throw new Error("API_ERROR: " + errMsg);
      }
      rawResponseText = await res.text();
      let data;
      try { data = JSON.parse(rawResponseText); } catch (parseErr) {
        const err = new SyntaxError("Réponse de l'API Gemini invalide.");
        err.rawText = rawResponseText;
        throw err;
      }
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    } else {
      throw new Error('Fournisseur IA inconnu : ' + provider);
    }

    // Nettoyer et parser le JSON
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
      const err = new SyntaxError("L'IA n'a pas renvoyé un format JSON valide.");
      err.rawText = text || rawResponseText;
      throw err;
    }
    const clean = text.substring(startIdx, endIdx + 1).trim();
    try {
      return JSON.parse(clean);
    } catch (parseErr) {
      const err = new SyntaxError("Erreur de parsing JSON.");
      err.rawText = text || rawResponseText;
      throw err;
    }

  } catch (e) {
    console.error('Erreur IA:', e);
    throw e;
  }
}

// ══════════════════════════════════════════════
// MIGRATION AUTOMATIQUE DES CATÉGORIES (Usage unique)
// ══════════════════════════════════════════════
(function migrateCategories() {
  if (localStorage.getItem('se_migrated_cats_v1')) return;

  let catData = localStorage.getItem('se_catalogue');
  if (catData) {
    try {
      let catalogue = JSON.parse(catData);
      let modified = false;
      catalogue.forEach(p => {
        const c = (p.categorie || '').trim();
        if (c !== "Main d'\u0153uvre" && c !== "Main d'oeuvre" && c !== "Forfait" && c !== "Forfaits") {
          p.categorie = "Enregistré manuellement";
          modified = true;
        }
      });
      if (modified) {
        localStorage.setItem('se_catalogue', JSON.stringify(catalogue));
      }
    } catch (e) {
      console.error("Erreur migration catalogue", e);
    }
  }
  localStorage.setItem('se_migrated_cats_v1', 'true');
})();

// ══════════════════════════════════════════════
// CRÉER FACTURE DEPUIS DEVIS
// ══════════════════════════════════════════════
function creerFactureDepuisDevis(devis_id, type = 'solde') {
  const devis = DB.getDevisById(devis_id);
  if (!devis) return null;

  const cfg = DB.getConfig();
  const annee = new Date().getFullYear();
  const today = new Date().toISOString().split('T')[0];

  let numero, montant, titre;

  if (type === 'acompte') {
    numero = DB.getNextNumero('acompte');
    montant = Math.round(devis.montant_ht * (cfg.devis.acompte_pct / 100) * 100) / 100;
    titre = `Facture d'acompte (${cfg.devis.acompte_pct}%) — ${devis.numero}`;
  } else {
    numero = DB.getNextNumero('facture');
    const deja = devis.deja_facture || 0;
    montant = Math.round((devis.montant_ht - deja) * 100) / 100;
    titre = `Facture de solde — ${devis.numero}`;
  }

  const facture = {
    id: genId(),
    numero,
    type,
    titre,
    devis_id,
    devis_numero: devis.numero,
    client: devis.client,
    client_id: devis.client_id,
    objet: devis.objet,
    lignes: type === 'acompte' ? [{
      designation: `Acompte ${cfg.devis.acompte_pct}% — ${devis.objet}`,
      description: `Acompte sur devis ${devis.numero}`,
      qte: 1,
      pu: montant,
      total: montant
    }] : devis.lignes,
    montant_ht: montant,
    statut: 'Créé',
    date: today,
    date_echeance: addDays(today, 30),
  };

  DB.addFacture(facture);
  toast(`${type === 'acompte' ? "Facture d'acompte" : 'Facture de solde'} créée : ${numero}`, 'success');
  return facture;
}

// ══════════════════════════════════════════════
// CLONER UN DEVIS
// ══════════════════════════════════════════════
function clonerDevis(id) {
  const original = DB.getDevisById(id);
  if (!original) return null;

  const clone = {
    ...original,
    id: undefined,
    numero: DB.getNextNumero('devis'),
    statut: 'Créé',
    date: new Date().toISOString().split('T')[0],
    date_validite: addDays(new Date(), DB.getConfig().devis.validite_jours),
    deja_facture: 0,
    created_at: undefined,
    updated_at: undefined,
  };

  return DB.addDevis(clone);
}

// ══════════════════════════════════════════════
// ENVOI EMAIL (simulation — à connecter à un service)
// ══════════════════════════════════════════════
function envoyerDevisParMail(devis_id) {
  const devis = DB.getDevisById(devis_id);
  if (!devis) return;

  const email = devis.client_email || '';
  if (!email) {
    toast('Aucun email client renseigné', 'error');
    return;
  }

  // Ouvre le client mail avec le sujet pré-rempli
  const sujet = encodeURIComponent(`Devis ${devis.numero} — StarElec`);
  const corps = encodeURIComponent(
    `Bonjour ${devis.client},\n\nVeuillez trouver ci-joint le devis ${devis.numero} d'un montant de ${fmt(devis.montant_ht)} HT.\n\nCordialement,\nFlorian Fernandes\nStarElec\n${CONFIG.entreprise.tel}`
  );

  window.location.href = `mailto:${email}?subject=${sujet}&body=${corps}`;
  DB.updateStatut(devis_id, 'Envoyé');
  toast('Statut mis à jour : Envoyé', 'success');
}

// ══════════════════════════════════════════════
// EXPORT PDF / JSON / XML
// ══════════════════════════════════════════════
function exporterJSON(devis_id) {
  const devis = DB.getDevisById(devis_id);
  if (!devis) return;
  const blob = new Blob([JSON.stringify(devis, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${devis.numero.replace('/', '-')}.json`;
  a.click();
  toast('Export JSON téléchargé', 'success');
}

function exporterXML(devis_id) {
  const devis = DB.getDevisById(devis_id);
  if (!devis) return;

  const lignesXML = (devis.lignes || []).map(l => `
    <ligne>
      <designation>${escXML(l.designation)}</designation>
      <qte>${l.qte}</qte>
      <pu>${l.pu}</pu>
      <total>${l.total || 0}</total>
    </ligne>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<devis>
  <numero>${escXML(devis.numero)}</numero>
  <date>${devis.date}</date>
  <client>${escXML(devis.client)}</client>
  <objet>${escXML(devis.objet || '')}</objet>
  <montant_ht>${devis.montant_ht}</montant_ht>
  <statut>${escXML(devis.statut)}</statut>
  <lignes>${lignesXML}
  </lignes>
</devis>`;

  const blob = new Blob([xml], { type: 'application/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${devis.numero.replace('/', '-')}.xml`;
  a.click();
  toast('Export XML téléchargé', 'success');
}

function escXML(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ══════════════════════════════════════════════
// LIEN APERÇU PUBLIC
// ══════════════════════════════════════════════
function copierLienApercu(devis_id) {
  const url = `${window.location.origin}/voir.html?id=${devis_id}`;
  navigator.clipboard.writeText(url).then(() => {
    toast('Lien copié dans le presse-papier', 'success');
  }).catch(() => {
    toast('Lien : ' + url, 'info', 6000);
  });
}
