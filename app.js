/* ============================================
   STARTELEC DEVIS — app.js
   Base de données locale + utilitaires
   ============================================ */

// ══════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════
const CONFIG = {
  entreprise: {
    nom:       'StarElec',
    siret:     '880 075 098 00025',
    iban:      'FR76 4061 8803 8000 0403 8380 440',
    bic:       'BOUSFRPPXXX',
    banque:    'Boursorama',
    adresse:   '9 rue Maurice Berger',
    cp:        '45000',
    ville:     'Orléans',
    pays:      'France',
    email:     'startelec45@gmail.com',
    tel:       '06 60 19 35 21',
    tva_msg:   'TVA non applicable, article 293B du CGI. Régime micro-entrepreneur.',
    vendeur:   'FLORIAN FERNANDES',
    lieu:      'Orléans',
  },
  devis: {
    validite_jours:  30,
    acompte_pct:     30,
    taux_horaire_mo: 46.00,
    marge_sonepar:   30,
    prefix_devis:    'D',
    prefix_facture:  'F',
    prefix_acompte:  'FA',
  }
};

// ══════════════════════════════════════════════
// BASE DE DONNÉES LOCALE (localStorage)
// ══════════════════════════════════════════════
const DB = {

  // ── DEVIS ──
  getDevis() {
    try { return JSON.parse(localStorage.getItem('se_devis') || '[]'); }
    catch(e) { return []; }
  },

  saveDevis(list) {
    localStorage.setItem('se_devis', JSON.stringify(list));
  },

  getDevisById(id) {
    return this.getDevis().find(d => d.id === id) || null;
  },

  addDevis(devis) {
    const list = this.getDevis();
    devis.id         = devis.id || genId();
    devis.created_at = new Date().toISOString();
    devis.updated_at = new Date().toISOString();
    list.unshift(devis);
    this.saveDevis(list);
    return devis;
  },

  updateDevis(id, data) {
    const list = this.getDevis();
    const idx  = list.findIndex(d => d.id === id);
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
    const list    = this.getDevis();
    const annee   = new Date().getFullYear();
    const prefix  = type === 'facture' ? CONFIG.devis.prefix_facture
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
    catch(e) { return []; }
  },

  saveClients(list) {
    localStorage.setItem('se_clients', JSON.stringify(list));
  },

  getClientById(id) {
    return this.getClients().find(c => c.id === id) || null;
  },

  addClient(client) {
    const list = this.getClients();
    client.id         = client.id || genId();
    client.created_at = new Date().toISOString();
    list.unshift(client);
    this.saveClients(list);
    return client;
  },

  updateClient(id, data) {
    const list = this.getClients();
    const idx  = list.findIndex(c => c.id === id);
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
    } catch(e) { return DEFAULT_CATALOGUE; }
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
    const idx  = list.findIndex(p => p.id === id);
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
    } catch(e) { return CONFIG; }
  },

  saveConfig(data) {
    localStorage.setItem('se_config', JSON.stringify(data));
  },

  // ── FACTURES LIÉES ──
  getFactures() {
    try { return JSON.parse(localStorage.getItem('se_factures') || '[]'); }
    catch(e) { return []; }
  },

  saveFactures(list) {
    localStorage.setItem('se_factures', JSON.stringify(list));
  },

  addFacture(facture) {
    const list = this.getFactures();
    facture.id         = facture.id || genId();
    facture.created_at = new Date().toISOString();
    list.unshift(facture);
    this.saveFactures(list);
    // Mettre à jour deja_facture sur le devis lié
    if (facture.devis_id) {
      const d = this.getDevisById(facture.devis_id);
      if (d) {
        const total_fact = list
          .filter(f => f.devis_id === facture.devis_id)
          .reduce((s,f) => s + (f.montant||0), 0);
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
  { id:'cat-01', categorie:'Appareillage', designation:'Prise de courant',           description:"Câbles + pot d'encastrement + mécanisme. Forfait prêt à brancher.",        pu: 80.00,  unite:'u' },
  { id:'cat-02', categorie:'Appareillage', designation:'Prise 20A (four / lave-linge)',description:"Câbles + pot + prise spécialisée 20A. Forfait prêt à brancher.",           pu: 135.00, unite:'u' },
  { id:'cat-03', categorie:'Appareillage', designation:'Plaque de cuisson (32A)',     description:"Câbles + alimentation dédiée grande puissance.",                            pu: 190.00, unite:'u' },
  { id:'cat-04', categorie:'Éclairage',   designation:'Simple allumage',             description:"Câbles + pot + interrupteur simple. Forfait prêt à brancher.",               pu: 90.00,  unite:'u' },
  { id:'cat-05', categorie:'Éclairage',   designation:'Va-et-vient',                 description:"Câbles + pot + mécanisme va-et-vient complet.",                              pu: 160.00, unite:'u' },
  { id:'cat-06', categorie:'Éclairage',   designation:'Bouton-poussoir',             description:"Câbles + pot + appareillage complet avec télérupteur.",                      pu: 145.00, unite:'u' },
  { id:'cat-07', categorie:'Alimentation',designation:'Alimentation directe',        description:"Câbles + alimentation directe (hors tableau).",                              pu: 70.00,  unite:'u' },
  { id:'cat-08', categorie:'Alimentation',designation:'Alimentation directe VMC',    description:"Câbles + alimentation dédiée VMC.",                                          pu: 70.00,  unite:'u' },
  { id:'cat-09', categorie:'Chauffage',   designation:'Ligne radiateur',             description:"Câbles + alimentation radiateur (sans fourniture appareil).",                 pu: 90.00,  unite:'u' },
  { id:'cat-10', categorie:'Alimentation',designation:'Ballon eau chaude (BECS)',    description:"Câbles + alimentation ballon eau chaude sanitaire.",                         pu: 150.00, unite:'u' },
  { id:'cat-11', categorie:'Réseau',      designation:'Ligne réseau RJ45',           description:"Câbles + prise RJ45 encastrée.",                                             pu: 120.00, unite:'u' },
  { id:'cat-12', categorie:'Main d\'œuvre',designation:'Main d\'œuvre',              description:"Taux horaire main d'œuvre électricité.",                                     pu: 46.00,  unite:'h' },
];

// ══════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2,5);
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
  return nom.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().substring(0,2);
}

function getUrlParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ── TOAST ──
function toast(msg, type='info', duration=3000) {
  const container = document.getElementById('toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success:'ti-check', error:'ti-alert-circle', info:'ti-info-circle' };
  el.innerHTML = `<i class="ti ${icons[type]||'ti-info-circle'}"></i> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ── DROPDOWNS ──
function toggleDropdown(btn) {
  const dropdown = btn.closest('.dropdown');
  const wasOpen  = dropdown.classList.contains('open');
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
  const pu  = parseFloat(ligne.pu)  || 0;
  return Math.round(qte * pu * 100) / 100;
}

function calculerTotaux(lignes) {
  const total_ht = lignes.reduce((s,l) => s + (l.total||calculerLigne(l)), 0);
  const acompte  = Math.round(total_ht * (CONFIG.devis.acompte_pct / 100) * 100) / 100;
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

    const catalogue = DB.getCatalogue();
    const matches   = catalogue.filter(p =>
      p.designation.toLowerCase().includes(q) ||
      (p.categorie||'').toLowerCase().includes(q)
    ).slice(0, 8);

    if (!matches.length) { list.classList.remove('open'); return; }

    list.innerHTML = matches.map(p => `
      <div class="autocomplete-item" data-id="${p.id}">
        <span>${p.designation}</span>
        <span class="ac-prix">${fmt(p.pu)} / ${p.unite||'u'}</span>
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
// GÉNÉRATION PDF via Netlify Function
// ══════════════════════════════════════════════
async function genererPDF(devis_id, type = 'devis') {
  const devis = DB.getDevisById(devis_id);
  if (!devis) { toast('Devis introuvable', 'error'); return; }

  const cfg = DB.getConfig();

  try {
    toast('Génération du PDF en cours...', 'info');

    const payload = {
      type,
      devis,
      config: cfg.entreprise,
    };

    const res = await fetch('/.netlify/functions/generate-pdf', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Erreur serveur');

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${devis.numero.replace('/','-')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast('PDF téléchargé !', 'success');

  } catch(e) {
    console.error(e);
    toast('Erreur lors de la génération du PDF', 'error');
  }
}

// ══════════════════════════════════════════════
// IA — APPEL CLAUDE API
// ══════════════════════════════════════════════
async function appelIA(prompt, contexte = {}) {
  const cfg       = DB.getConfig();
  const catalogue = DB.getCatalogue();

  const systemPrompt = `Tu es l'assistant de facturation de ${cfg.entreprise.nom}, entreprise d'électricité à ${cfg.entreprise.ville}.
Tu aides à créer des devis professionnels.

CATALOGUE DES PRESTATIONS DISPONIBLES :
${catalogue.map(p => `- ${p.designation} : ${p.pu}€/${p.unite} — ${p.description}`).join('\n')}

RÈGLES :
- Taux horaire main d'œuvre : ${cfg.devis.taux_horaire_mo}€/h
- Marge matériel Sonepar : +${cfg.devis.marge_sonepar}%
- TVA non applicable (micro-entrepreneur)
- Toujours utiliser les prix du catalogue sauf si précisé autrement
- Répondre en JSON structuré uniquement

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

  const userPrompt = `${prompt}

${contexte.devisExistant ? `Devis en cours : ${JSON.stringify(contexte.devisExistant)}` : ''}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-haiku-4-5',
        max_tokens: 1500,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Erreur API');
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    // Nettoyer et parser le JSON
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);

  } catch(e) {
    console.error('Erreur IA:', e);
    throw e;
  }
}

// ══════════════════════════════════════════════
// CRÉER FACTURE DEPUIS DEVIS
// ══════════════════════════════════════════════
function creerFactureDepuisDevis(devis_id, type = 'solde') {
  const devis = DB.getDevisById(devis_id);
  if (!devis) return null;

  const cfg    = DB.getConfig();
  const annee  = new Date().getFullYear();
  const today  = new Date().toISOString().split('T')[0];

  let numero, montant, titre;

  if (type === 'acompte') {
    numero  = DB.getNextNumero('acompte');
    montant = Math.round(devis.montant_ht * (cfg.devis.acompte_pct / 100) * 100) / 100;
    titre   = `Facture d'acompte (${cfg.devis.acompte_pct}%) — ${devis.numero}`;
  } else {
    numero  = DB.getNextNumero('facture');
    const deja = devis.deja_facture || 0;
    montant    = Math.round((devis.montant_ht - deja) * 100) / 100;
    titre      = `Facture de solde — ${devis.numero}`;
  }

  const facture = {
    id:         genId(),
    numero,
    type,
    titre,
    devis_id,
    devis_numero: devis.numero,
    client:     devis.client,
    client_id:  devis.client_id,
    objet:      devis.objet,
    lignes:     type === 'acompte' ? [{
      designation: `Acompte ${cfg.devis.acompte_pct}% — ${devis.objet}`,
      description: `Acompte sur devis ${devis.numero}`,
      qte: 1,
      pu: montant,
      total: montant
    }] : devis.lignes,
    montant_ht:  montant,
    statut:      'Créé',
    date:        today,
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
    id:          undefined,
    numero:      DB.getNextNumero('devis'),
    statut:      'Créé',
    date:        new Date().toISOString().split('T')[0],
    date_validite: addDays(new Date(), DB.getConfig().devis.validite_jours),
    deja_facture: 0,
    created_at:  undefined,
    updated_at:  undefined,
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
  const sujet  = encodeURIComponent(`Devis ${devis.numero} — StarElec`);
  const corps  = encodeURIComponent(
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
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `${devis.numero.replace('/','-')}.json`;
  a.click();
  toast('Export JSON téléchargé', 'success');
}

function exporterXML(devis_id) {
  const devis = DB.getDevisById(devis_id);
  if (!devis) return;

  const lignesXML = (devis.lignes||[]).map(l => `
    <ligne>
      <designation>${escXML(l.designation)}</designation>
      <qte>${l.qte}</qte>
      <pu>${l.pu}</pu>
      <total>${l.total||0}</total>
    </ligne>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<devis>
  <numero>${escXML(devis.numero)}</numero>
  <date>${devis.date}</date>
  <client>${escXML(devis.client)}</client>
  <objet>${escXML(devis.objet||'')}</objet>
  <montant_ht>${devis.montant_ht}</montant_ht>
  <statut>${escXML(devis.statut)}</statut>
  <lignes>${lignesXML}
  </lignes>
</devis>`;

  const blob = new Blob([xml], { type: 'application/xml' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `${devis.numero.replace('/','-')}.xml`;
  a.click();
  toast('Export XML téléchargé', 'success');
}

function escXML(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
