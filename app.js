/* ============================================
   STARTELEC DEVIS — app.js
   Base de données Supabase (Version Sécurisée)
   ============================================ */

// ── SÉCURITÉ ADMIN ──
// Vérifie si on est connecté, sauf sur les pages publiques
(function() {
  const publicPages = ['login', 'espace-client', 'voir', 'voir-facture'];
  let currentPage = window.location.pathname.split('/').pop() || 'index';
  currentPage = currentPage.replace(/\.html$/, '');
  
  if (!publicPages.includes(currentPage)) {
    const isAuth = localStorage.getItem('se_admin_auth');
    if (!isAuth) {
      window.location.href = 'login.html';
    }
  }
})();


// Ces variables iront chercher les configurations injectées ou serviront de passerelle
const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'https://komwitqbcrvxixpgvnxi.supabase.co';
const SUPABASE_KEY = window.ENV?.SUPABASE_KEY || 'sb_publishable_wyiTO5uJaP70J22LEO7SlQ_ntO73jcT';

// ── Client Supabase léger (sans SDK) ──
const SB = {
  async query(table, method = 'GET', body = null, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
    const opts = {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${localStorage.getItem('sb_token') || SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erreur ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  },

  async select(table, params = '') {
    return this.query(table, 'GET', null, params);
  },

  async insert(table, data) {
    return this.query(table, 'POST', data, '');
  },

  async update(table, id, data) {
    return this.query(table, 'PATCH', data, `?id=eq.${id}`);
  },

  async delete(table, id) {
    return this.query(table, 'DELETE', null, `?id=eq.${id}`);
  },
};

// ══════════════════════════════════════════════
// BASE DE DONNÉES — Supabase
// ══════════════════════════════════════════════
const DB = {

  async getDevis() {
    try {
      return await SB.select('devis', '?order=created_at.desc');
    } catch (e) { console.error('getDevis:', e); return []; }
  },

  async getDevisById(id) {
    try {
      const res = await SB.select('devis', `?id=eq.${id}`);
      return res[0] || null;
    } catch (e) { return null; }
  },

  async addDevis(data) {
    try {
      const res = await SB.insert('devis', {
        ...data,
        lignes: data.lignes || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return res[0];
    } catch (e) { console.error('addDevis:', e); throw e; }
  },

  async updateDevis(id, data) {
    try {
      const res = await SB.update('devis', id, {
        ...data,
        updated_at: new Date().toISOString(),
      });
      return res[0];
    } catch (e) { console.error('updateDevis:', e); throw e; }
  },

  async updateStatut(id, statut) {
    return this.updateDevis(id, { statut });
  },

  async deleteDevis(id) {
    try {
      await SB.delete('devis', id);
    } catch (e) { console.error('deleteDevis:', e); throw e; }
  },

  async getNextNumero(type = 'devis') {
    try {
      const annee = new Date().getFullYear();
      const cfg = await this.getConfig();
      const prefix = type === 'facture' ? cfg.devis.prefix_facture
        : type === 'acompte' ? cfg.devis.prefix_acompte
          : cfg.devis.prefix_devis;
      const pattern = `${prefix}${annee}/`;
      const table = (type === 'facture' || type === 'acompte') ? 'factures' : 'devis';
      const rows = await SB.select(table, `?numero=like.${pattern}*&select=numero`);
      const nums = rows.map(r => parseInt((r.numero || '').replace(pattern, '')) || 0);
      const next = nums.length ? Math.max(...nums) + 1 : 1;
      return `${pattern}${String(next).padStart(3, '0')}`;
    } catch (e) {
      return `D${new Date().getFullYear()}/001`;
    }
  },

  async getClients() {
    try {
      return await SB.select('clients', '?order=created_at.desc');
    } catch (e) { return []; }
  },

  async getClientById(id) {
    try {
      const res = await SB.select('clients', `?id=eq.${id}`);
      return res[0] || null;
    } catch (e) { return null; }
  },

  async addClient(data) {
    try {
      const res = await SB.insert('clients', { ...data, created_at: new Date().toISOString() });
      return res[0];
    } catch (e) { console.error('addClient:', e); throw e; }
  },

  async updateClient(id, data) {
    try {
      const res = await SB.update('clients', id, data);
      return res[0];
    } catch (e) { console.error('updateClient:', e); throw e; }
  },

  async deleteClient(id) {
    try {
      await SB.delete('clients', id);
    } catch (e) { console.error('deleteClient:', e); throw e; }
  },

  // ── CHANTIERS ──
  async getChantiers() {
    try {
      return await SB.select('chantiers', '?order=created_at.desc');
    } catch (e) { return []; }
  },

  async getChantiersByClient(client_id) {
    try {
      return await SB.select('chantiers', `?client_id=eq.${client_id}&order=created_at.desc`);
    } catch (e) { return []; }
  },

  async getChantierById(id) {
    try {
      const res = await SB.select('chantiers', `?id=eq.${id}`);
      return res[0] || null;
    } catch (e) { return null; }
  },

  async addChantier(data) {
    try {
      const res = await SB.insert('chantiers', { ...data, created_at: new Date().toISOString() });
      return res[0];
    } catch (e) { console.error('addChantier:', e); throw e; }
  },

  async updateChantier(id, data) {
    try {
      const res = await SB.update('chantiers', id, { ...data, updated_at: new Date().toISOString() });
      return res[0];
    } catch (e) { console.error('updateChantier:', e); throw e; }
  },

  async deleteChantier(id) {
    try {
      await SB.delete('chantiers', id);
    } catch (e) { console.error('deleteChantier:', e); throw e; }
  },

  // ── TÂCHES DE CHANTIER ──
  async getTachesByChantier(chantier_id) {
    try {
      return await SB.select('taches_chantier', `?chantier_id=eq.${chantier_id}&order=categorie.asc,created_at.asc`);
    } catch (e) { return []; }
  },

  async addTache(data) {
    try {
      const res = await SB.insert('taches_chantier', { ...data, created_at: new Date().toISOString() });
      return res[0];
    } catch (e) { console.error('addTache:', e); throw e; }
  },

  async updateTache(id, data) {
    try {
      const res = await SB.update('taches_chantier', id, { ...data, updated_at: new Date().toISOString() });
      return res[0];
    } catch (e) { console.error('updateTache:', e); throw e; }
  },

  async deleteTache(id) {
    try {
      await SB.delete('taches_chantier', id);
    } catch (e) { console.error('deleteTache:', e); throw e; }
  },

  // ── TRAVAUX SUPPLÉMENTAIRES ──
  async getTravauxSuppByChantier(chantierId) {
    try {
      return await SB.select('travaux_supp', `?chantier_id=eq.${chantierId}&order=created_at.asc`);
    } catch (e) { return []; }
  },

  async addTravailSupp(data) {
    try {
      const res = await SB.insert('travaux_supp', {
        ...data,
        created_at: new Date().toISOString()
      });
      return res[0];
    } catch (e) { console.error('addTravailSupp:', e); throw e; }
  },

  async updateTravailSupp(id, data) {
    try {
      const res = await SB.update('travaux_supp', id, {
        ...data,
        updated_at: new Date().toISOString()
      });
      return res[0];
    } catch (e) { console.error('updateTravailSupp:', e); throw e; }
  },

  async deleteTravailSupp(id) {
    try {
      await SB.delete('travaux_supp', id);
    } catch (e) { console.error('deleteTravailSupp:', e); throw e; }
  },

  // ── TOKENS CLIENTS ──
  async generateClientToken(client_id) {
    try {
      // Génère un token unique robuste
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
      await SB.update('clients', client_id, { token: token });
      return token;
    } catch (e) { console.error('generateToken:', e); throw e; }
  },


  async getCatalogue(search = '') {
    try {
      let params = '?order=categorie.asc,designation.asc';
      if (search) params += `&designation=ilike.*${search}*`;
      return await SB.select('catalogue', params);
    } catch (e) { return []; }
  },

  async searchCatalogue(q) {
    try {
      if (!q || q.length < 2) return [];

      // Séparer les mots et retirer les petits mots (ex: "de", "le")
      const words = q.toLowerCase().split(' ').map(w => w.trim()).filter(w => w.length > 1);
      if (words.length === 0) return [];

      let results = [];
      let currentWords = [...words];

      // Limite de sécurité pour éviter trop de requêtes si l'utilisateur tape une longue phrase
      const maxAttempts = Math.min(currentWords.length, 5);
      let attempts = 0;

      while (currentWords.length > 0 && results.length === 0 && attempts < maxAttempts) {
        attempts++;
        
        // On construit une requête où TOUS les mots restants doivent être présents (AND)
        // On cherche le mot soit dans la désignation, soit dans la catégorie, soit dans la description
        const andArray = currentWords.map(w => `or(designation.ilike.*${w}*,categorie.ilike.*${w}*,description.ilike.*${w}*)`);
        const andQuery = `?and=(${andArray.join(',')})&limit=50`;

        results = await SB.select('catalogue', andQuery);

        if (results && results.length > 0) {
          break;
        }

        // Si aucun résultat, on retire le dernier mot (le moins important) et on recommence
        currentWords.pop();
      }

      return results || [];
    } catch (e) { console.error('searchCatalogue:', e); return []; }
  },

  async addPrestation(data) {
    try {
      const res = await SB.insert('catalogue', data);
      return res[0];
    } catch (e) { console.error('addPrestation:', e); throw e; }
  },

  async updatePrestation(id, data) {
    try {
      const res = await SB.update('catalogue', id, data);
      return res[0];
    } catch (e) { console.error('updatePrestation:', e); throw e; }
  },

  async deletePrestation(id) {
    try {
      await SB.delete('catalogue', id);
    } catch (e) { console.error('deletePrestation:', e); throw e; }
  },

  async getConfig() {
    try {
      const res = await SB.select('config', '?id=eq.1');
      if (res[0]) return { entreprise: res[0].entreprise || {}, devis: res[0].devis || {} };
      return CONFIG;
    } catch (e) { return CONFIG; }
  },

  async saveConfig(data) {
    try {
      await SB.update('config', 1, { entreprise: data.entreprise, devis: data.devis });
    } catch (e) { console.error('saveConfig:', e); throw e; }
  },

  async addCategorie(catName) {
    if (!catName) return;
    const cfg = await this.getConfig();
    cfg.entreprise.categories = cfg.entreprise.categories || ['Prestations manuelles', "Main d'œuvre", 'Appareillage', 'Éclairage', 'Alimentation', 'Chauffage', 'Réseau', 'Forfaits', 'Enregistré manuellement', 'Autre'];
    if (!cfg.entreprise.categories.includes(catName)) {
      cfg.entreprise.categories.push(catName);
      await this.saveConfig(cfg);
    }
  },

  async editCategorie(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;
    const cfg = await this.getConfig();
    if (cfg.entreprise.categories) {
      const idx = cfg.entreprise.categories.indexOf(oldName);
      if (idx !== -1) {
        cfg.entreprise.categories[idx] = newName;
        await this.saveConfig(cfg);
      }
    }
    try {
      await SB.query('catalogue', 'PATCH', { categorie: newName }, `?categorie=eq.${encodeURIComponent(oldName)}`);
    } catch(e) { console.error('editCategorie catalogue update:', e); }
  },

  async deleteCategorie(catName) {
    if (!catName) return;
    const cfg = await this.getConfig();
    if (cfg.entreprise.categories) {
      cfg.entreprise.categories = cfg.entreprise.categories.filter(c => c !== catName);
      await this.saveConfig(cfg);
    }
  },

  async getFactures() {
    try {
      return await SB.select('factures', '?order=created_at.desc');
    } catch (e) { return []; }
  },

  async getFacturesByDevis(devis_id) {
    try {
      return await SB.select('factures', `?devis_id=eq.${devis_id}`);
    } catch (e) { return []; }
  },

  async addFacture(data) {
    try {
      const res = await SB.insert('factures', { ...data, created_at: new Date().toISOString() });
      if (data.devis_id) {
        const factures = await this.getFacturesByDevis(data.devis_id);
        const total = factures.reduce((s, f) => s + (f.montant_ht || f.montant || 0), 0);
        await this.updateDevis(data.devis_id, { deja_facture: total });
      }
      return res[0];
    } catch (e) { console.error('addFacture:', e); throw e; }
  },

  async updateFacture(id, data) {
    try {
      const res = await SB.update('factures', id, data);
      const f = res[0];
      if (f && f.devis_id) {
        const factures = await this.getFacturesByDevis(f.devis_id);
        const total = factures.reduce((s, x) => s + (x.montant_ht || x.montant || 0), 0);
        await this.updateDevis(f.devis_id, { deja_facture: total });
      }
      return f;
    } catch (e) { console.error('updateFacture:', e); throw e; }
  },

  async deleteFacture(id) {
    try {
      const allFact = await this.getFactures();
      const f = allFact.find(x => x.id === id);
      
      await SB.delete('factures', id);
      
      if (f && f.devis_id) {
        const factures = await this.getFacturesByDevis(f.devis_id);
        const total = factures.reduce((s, x) => s + (x.montant_ht || x.montant || 0), 0);
        await this.updateDevis(f.devis_id, { deja_facture: total });
      }
    } catch (e) { console.error('deleteFacture:', e); throw e; }
  },

  // ── SUGGESTIONS CLIENTS ──
  async getSuggestions() {
    try {
      return await SB.select('suggestions_client', '?order=created_at.desc');
    } catch (e) { return []; }
  },

  async markSuggestionRead(id) {
    try {
      await SB.update('suggestions_client', id, { lu: true });
    } catch (e) { console.error('markSuggestionRead:', e); }
  },
};

// ══════════════════════════════════════════════
// CONFIG PAR DÉFAUT (Masquée et nettoyée pour GitHub public)
// ══════════════════════════════════════════════
const CONFIG = {
  entreprise: {
    nom: 'StarElec', siret: '—',
    iban: '—', bic: '—', banque: '—',
    adresse: '—', cp: '—', ville: 'Orléans', pays: 'France',
    email: '—', tel: '—',
    tva_msg: 'TVA non applicable, article 293B du CGI. Régime micro-entrepreneur.',
    vendedor: '—', lieu: 'Orléans',
  },
  devis: {
    validite_jours: 30, acompte_pct: 30,
    taux_horaire_mo: 46.00, marge_sonepar: 30,
    prefix_devis: 'D', prefix_facture: 'F', prefix_acompte: 'FA',
    tva_active: false, tva_taux_defaut: 20,
  }
};

// ══════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function fmt(n) {
  if (isNaN(n) || n === null || n === undefined) return '0,00 €';
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

function toggleDropdown(btn) {
  const dropdown = btn.closest('.dropdown');
  const wasOpen = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!wasOpen) {
    dropdown.classList.add('open');
    const ov = document.getElementById('overlay');
    if (ov) ov.style.display = 'block';
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
  const ov = document.getElementById('overlay');
  if (ov) ov.style.display = 'none';
}

function calculerLigne(ligne) {
  const qte = parseFloat(ligne.qte) || 0;
  const pu = parseFloat(ligne.pu) || 0;
  const reduc = parseFloat(ligne.reduc) || 0;
  return Math.round(qte * pu * (1 - reduc / 100) * 100) / 100;
}

function calculerTotaux(lignes) {
  const total_ht = lignes
    .filter(l => l.type === 'produit' || !l.type)
    .reduce((s, l) => s + (l.total || calculerLigne(l)), 0);
  return { total_ht, total_ttc: total_ht, acompte: Math.round(total_ht * 0.30 * 100) / 100 };
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

  let timer = null;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(timer);
    if (!q || q.length < 2) { list.classList.remove('open'); return; }

    timer = setTimeout(async () => {
      try {
        const matches = await DB.searchCatalogue(q);
        if (!matches.length) { list.classList.remove('open'); return; }

        list.innerHTML = matches.map(p => `
          <div class="autocomplete-item" data-id="${p.id}">
            <span>${p.designation}</span>
            <span class="ac-prix">${fmt(p.pu)} / ${p.unite || 'u'}</span>
          </div>`).join('');

        list.querySelectorAll('.autocomplete-item').forEach(item => {
          item.addEventListener('click', () => {
            const p = matches.find(x => x.id === item.dataset.id);
            if (p) onSelect(p);
            list.classList.remove('open');
          });
        });

        list.classList.add('open');
      } catch (e) { console.error('Autocomplete:', e); }
    }, 300);
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) list.classList.remove('open');
  });
}

// ══════════════════════════════════════════════
// IA — CLAUDE API
// ══════════════════════════════════════════════
async function appelIA(prompt) {
  const cfg = await DB.getConfig();
  const apiKey = localStorage.getItem('se_api_key') || '';
  const provider = localStorage.getItem('se_ai_provider') || 'anthropic';
  const model = localStorage.getItem('se_ai_model') || (provider === 'anthropic' ? 'claude-haiku-4-5' : 'gemini-2.5-flash');

  if (!apiKey) throw new Error('Clé API non configurée. Allez dans Réglages.');

  const systemPrompt = `Tu es l'assistant de facturation de ${cfg.entreprise.nom}, électricien à ${cfg.entreprise.ville}.

RÈGLES : Taux MO ${cfg.devis.taux_horaire_mo}€/h. TVA non applicable. Répondre UNIQUEMENT en JSON. 
Si des matériels précis sont demandés, mets "0" pour le pu (le catalogue s'en chargera).
INTERDICTION FORMELLE : N'invente JAMAIS de références spécifiques ou de noms de gammes (Legrand, Schneider, Céliane, Odace, Dooxie, etc.) si le client ne les a pas expressément tapés. 
Pour toute demande d'appareillage (prise, va-et-vient, interrupteur, spot, etc.) sans précision de marque, tu DOIS créer une ligne de prestation forfaitaire générique (ex: "Fourniture et pose d'un va-et-vient standard") et estimer un prix unitaire global directement (ex: 80€ ou 90€ l'unité).

FORMAT :
{"client":{"nom":"","type":"Particulier","civilite":"","prenom":"","nom_famille":"","societe":"","adresse":"","cp":"","ville":"","email":"","tel":""},"objet":"","lignes":[{"designation":"","description":"","qte":1,"pu":0,"unite":"u","total":0}],"note":""}`;

  let text = '';

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erreur API Anthropic ${res.status}`);
    }
    const data = await res.json();
    text = data.content?.[0]?.text || '';
  } else if (provider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erreur API Gemini ${res.status}`);
    }
    const data = await res.json();
    text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  const clean = text.replace(/```json|```/g, '').trim();
  const result = JSON.parse(clean);

  // Recherche ciblée des prix dans le catalogue (RAG post-génération)
  if (result.lignes && result.lignes.length > 0) {
    for (const ligne of result.lignes) {
      if (!ligne.designation) continue;
      // On cherche une correspondance (ex: "prise legrand" -> "Prise 2P+T Legrand Dooxie")
      const matches = await DB.searchCatalogue(ligne.designation);
      if (matches && matches.length > 0) {
        // On prend la première correspondance (la plus pertinente)
        const match = matches[0];
        ligne.pu = match.pu;
        ligne.designation = match.designation; // Remplacement par le vrai nom du catalogue
        ligne.unite = match.unite || ligne.unite;
      }
      // Si la ligne est identifiée comme de la Main d'oeuvre et qu'on n'a pas trouvé, on applique le taux horaire de la config
      else if (ligne.designation.toLowerCase().includes('main d\'oeuvre') || ligne.designation.toLowerCase().includes('main d’oeuvre') || ligne.designation.toLowerCase().includes('mo')) {
        ligne.pu = cfg.devis.taux_horaire_mo || ligne.pu;
      }

      ligne.total = parseFloat((ligne.pu * ligne.qte).toFixed(2));
    }
  }

  return result;
}

// ══════════════════════════════════════════════
// CRÉER FACTURE DEPUIS DEVIS
// ══════════════════════════════════════════════
async function creerFactureDepuisDevis(devis_id, type = 'solde') {
  const devis = await DB.getDevisById(devis_id);
  if (!devis) return null;

  const cfg = await DB.getConfig();
  const today = new Date().toISOString().split('T')[0];
  const numero = await DB.getNextNumero(type === 'acompte' ? 'acompte' : 'facture');
  const tvaActive = cfg.devis?.tva_active || false;

  let lines = [];
  let montant_ht = 0;
  let montant_ttc = 0;
  let titre = '';

  if (type === 'acompte') {
    const acompte_pct = devis.acompte_pct !== undefined && devis.acompte_pct !== null ? devis.acompte_pct : (cfg.devis.acompte_pct || 30);
    montant_ht = Math.round(devis.montant_ht * (acompte_pct / 100) * 100) / 100;
    titre = `Facture d'acompte (${acompte_pct}%) — ${devis.numero}`;
    
    // Determine VAT rate from devis lines or config
    let tvaRate = cfg.devis?.tva_taux_defaut || 20;
    const firstProductWithTva = (devis.lignes || []).find(l => (l.type === 'produit' || !l.type) && l.tva !== undefined);
    if (firstProductWithTva) {
      tvaRate = parseFloat(firstProductWithTva.tva) || 0;
    }
    if (!tvaActive) tvaRate = 0;

    lines = [{
      id: genId(),
      designation: `Acompte ${acompte_pct}% — ${devis.objet || devis.numero}`,
      description: `Acompte sur devis ${devis.numero}`,
      qte: 1,
      pu: montant_ht,
      total: montant_ht,
      unite: 'forfait',
      tva: tvaRate
    }];
    montant_ttc = Math.round(montant_ht * (1 + tvaRate / 100) * 100) / 100;
  } else {
    titre = `Facture de solde — ${devis.numero}`;
    
    // Import lines and apply line discounts & global discounts directly to line prices
    lines = (devis.lignes || []).map(l => {
      if (l.type === 'soustotal' || l.type === 'texte') {
        return { ...l, id: l.id || genId() };
      }
      let pu = parseFloat(l.pu) || 0;
      if (l.reduc) {
        pu = pu * (1 - parseFloat(l.reduc) / 100);
      }
      if (devis.reduc_globale) {
        pu = pu * (1 - parseFloat(devis.reduc_globale) / 100);
      }
      pu = Math.round(pu * 100) / 100;
      const total = Math.round((parseFloat(l.qte) || 1) * pu * 100) / 100;
      return {
        ...l,
        id: l.id || genId(),
        pu,
        total,
        reduc: 0,
        tva: l.tva !== undefined ? parseFloat(l.tva) : (tvaActive ? (cfg.devis?.tva_taux_defaut || 20) : 0)
      };
    });

    // Find paid deposit invoices to deduct
    try {
      const factures = await DB.getFacturesByDevis(devis_id);
      const acomptesPayes = factures.filter(f => 
        (f.type === "Facture d'acompte" || f.titre?.includes("acompte")) && 
        f.statut === "Payé"
      );

      acomptesPayes.forEach(acompte => {
        const acompteHT = acompte.montant_ht || acompte.montant || 0;
        let acompteTvaRate = 0;
        if (acompte.lignes && acompte.lignes.length > 0) {
          acompteTvaRate = parseFloat(acompte.lignes[0].tva) || 0;
        }
        lines.push({
          id: genId(),
          designation: `Déduction acompte — Facture N° ${acompte.numero}`,
          description: `Acompte déjà réglé sur devis ${devis.numero}`,
          qte: 1,
          pu: -acompteHT,
          total: -acompteHT,
          unite: 'forfait',
          tva: acompteTvaRate
        });
      });
    } catch (err) {
      console.error("Erreur lors de la recherche des acomptes dans app.js:", err);
    }

    // Calculate final totals
    montant_ht = lines.reduce((s, l) => s + (l.type === 'soustotal' || l.type === 'texte' ? 0 : (l.total || 0)), 0);
    montant_ht = Math.round(montant_ht * 100) / 100;

    let tvaTotal = 0;
    if (tvaActive) {
      lines.forEach(l => {
        if (l.type !== 'soustotal' && l.type !== 'texte') {
          tvaTotal += (l.total || 0) * (parseFloat(l.tva) || 0) / 100;
        }
      });
    }
    tvaTotal = Math.round(tvaTotal * 100) / 100;
    montant_ttc = Math.round((montant_ht + tvaTotal) * 100) / 100;
  }

  // Conserver le régime fiscal (Sous-traitance) et les conditions du devis
  let notes = devis.infos_spec || '';
  if (devis.notes_privees && devis.notes_privees.includes('[[REGIME:SOUS_TRAITANCE]]')) {
    notes = (notes ? notes + '\n' : '') + '[[REGIME:SOUS_TRAITANCE]]';
  }

  return await DB.addFacture({
    numero, type: type === 'acompte' ? "Facture d'acompte" : 'Facture',
    titre, devis_id, devis_numero: devis.numero,
    client: devis.client, client_adresse: devis.client_adresse,
    client_email: devis.client_email, client_tel: devis.client_tel,
    objet: devis.objet,
    lignes: lines,
    montant_ht: montant_ht, montant: montant_ht, montant_ttc: montant_ttc,
    statut: 'Créé', date: today,
    date_echeance: addDays(today, 30),
    mode_reglement: devis.mode_reglement || 'Virement bancaire',
    notes,
  });
}

// ══════════════════════════════════════════════
// CLONER DEVIS
// ══════════════════════════════════════════════
async function clonerDevis(id) {
  const original = await DB.getDevisById(id);
  if (!original) return null;
  const numero = await DB.getNextNumero('devis');
  const today = new Date().toISOString().split('T')[0];
  return await DB.addDevis({
    ...original, id: undefined, numero, statut: 'Créé',
    date: today, date_validite: addDays(today, 30),
    deja_facture: 0, created_at: undefined, updated_at: undefined,
  });
}

// ══════════════════════════════════════════════
// EMAIL
// ══════════════════════════════════════════════
async function envoyerDevisParMail(devis_id) {
  const devis = await DB.getDevisById(devis_id);
  if (!devis) return;
  const email = devis.client_email || '';
  if (!email) { toast('Aucun email client renseigné', 'error'); return; }
  const sujet = encodeURIComponent(`Devis ${devis.numero} — StarElec`);
  const corps = encodeURIComponent(`Bonjour ${devis.client},\n\nVeuillez trouver ci-joint le devis ${devis.numero} d'un montant de ${fmt(devis.montant_ht)} HT.\n\nCordialement,\nFlorian Fernandes\nStarElec\n06 60 19 35 21`);
  window.location.href = `mailto:${email}?subject=${sujet}&body=${corps}`;
  await DB.updateStatut(devis_id, 'Envoyé');
  toast('Statut mis à jour : Envoyé', 'success');
}

// ══════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════
async function exporterJSON(devis_id) {
  const devis = await DB.getDevisById(devis_id);
  if (!devis) return;
  const blob = new Blob([JSON.stringify(devis, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(devis.numero || 'devis').replace('/', '-')}.json`;
  a.click();
  toast('Export JSON téléchargé', 'success');
}

async function exporterXML(devis_id) {
  const devis = await DB.getDevisById(devis_id);
  if (!devis) return;
  const lignesXML = (devis.lignes || []).map(l => `<ligne><designation>${escXML(l.designation)}</designation><qte>${l.qte}</qte><pu>${l.pu}</pu><total>${l.total || 0}</total></ligne>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><devis><numero>${escXML(devis.numero)}</numero><date>${devis.date}</date><client>${escXML(devis.client)}</client><objet>${escXML(devis.objet || '')}</objet><montant_ht>${devis.montant_ht}</montant_ht><statut>${escXML(devis.statut)}</statut><lignes>${lignesXML}</lignes></devis>`;
  const blob = new Blob([xml], { type: 'application/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(devis.numero || 'devis').replace('/', '-')}.xml`;
  a.click();
  toast('Export XML téléchargé', 'success');
}

function escXML(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function copierLienApercu(devis_id) {
  const url = `${window.location.origin}/voir.html?id=${devis_id}`;
  navigator.clipboard.writeText(url).then(() => toast('Lien copié !', 'success')).catch(() => toast('Lien : ' + url, 'info', 6000));
}

async function genererPDF(id) {
  try {
    let doc = await DB.getDevisById(id);
    let isFacture = false;
    if (!doc) {
      const allFact = await DB.getFactures();
      doc = allFact.find(f => f.id === id);
      if (doc) isFacture = true;
    }
    if (!doc) { toast('Document introuvable', 'error'); return; }
    toast('Génération PDF en cours...', 'info');
    const url = isFacture ? 'voir-facture.html' : 'voir.html';
    window.open(`${url}?id=${id}&action=pdf`, '_blank');
  } catch (e) {
    console.error(e);
    toast('Erreur PDF — ' + e.message, 'error');
  }
}
