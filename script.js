/* ================================================================
   PressingPro v3.0 — Logique métier
   MAS_DATA Solution
   ================================================================ */

var DS_KEY = 'pressingpro_data_v1';
var LIC_KEY = 'pressingpro_lic_v1';
var _SP = ['PR','SS','MAS','D26','ZK4'];
var _SALT = _SP.join('_');
var depot = { lines: [], paiement: 'especes', expressMode: null, oldMode: false };
var charts = {};
var _activePage = 'dashboard';

/* ══ UTILITAIRES ════════════════════════════════════════════════ */
function ge(id) { return document.getElementById(id); }
function qs(sel) { return document.querySelectorAll(sel); }
function setTxt(id, v) { var e = ge(id); if (e) e.textContent = v; }
function uid() { return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function today() { return new Date().toISOString().slice(0, 10); }
function now() { return new Date().toISOString(); }
function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function getData() {
  try {
    var d = JSON.parse(localStorage.getItem(DS_KEY));
    if (!d || !d.settings) return defaultData();
    if (!d.employes) d.employes = []; // migration : anciennes installations sans gestion employés
    if (!d.offres) d.offres = []; // migration : anciennes installations sans marketing
    if (!d.stock) d.stock = []; // migration : gestion de stock
    if (!d.settings.marketing) d.settings.marketing = { seuilInactifJours: 45 };
    if (!d.corbeille) d.corbeille = []; // migration : corbeille des tickets supprimés
    if (!d.emplacements) d.emplacements = []; // migration : rangement par casier
    return d;
  }
  catch (e) { return defaultData(); }
}
function saveData(d) {
  localStorage.setItem(DS_KEY, JSON.stringify(d));
  // Synchronisation avec le serveur SaaS (voir sync.js). Sans effet si
  // le module n'est pas chargé ou si l'utilisateur n'est pas connecté.
  if (window.PPSync) PPSync.schedulePush(d);
}


function seedTraitements() {
  return [
    { id: 't1', nom: 'Laver et repasser', desc: 'Lavage + repassage complet' },
    { id: 't2', nom: 'Repasser seulement', desc: 'Repassage sans lavage' }
  ];
}
var STOCK_PRICES = {
  'Détergent liquide': 6000, 'Poudre de détergent': 750, 'Javel': 600, 'Savon de Marseille': 1000,
  'Sinthe': 500, 'Sachets emballage (habits)': 1667, 'Sachets vestes': 2000, 'Rame de papier (emballage)': 2500,
  'Étiquettes habits': 1000, 'Agrafes linge': 2500, 'Agrafes emballage': 200, 'Bics (stylos)': 200
};
function seedStock() {
  return [
    { id: uid(), nom: 'Détergent liquide', categorie: 'Détergents & lessive', unite: 'bidon', qte: 2, seuil: 1, prixAchat: 6000, note: '' },
    { id: uid(), nom: 'Poudre de détergent', categorie: 'Détergents & lessive', unite: 'sachet', qte: 12, seuil: 4, prixAchat: 750, note: '' },
    { id: uid(), nom: 'Javel', categorie: 'Détergents & lessive', unite: 'bidon', qte: 5, seuil: 2, prixAchat: 600, note: '' },
    { id: uid(), nom: 'Savon de Marseille', categorie: 'Détergents & lessive', unite: 'morceau', qte: 9, seuil: 3, prixAchat: 1000, note: '' },
    { id: uid(), nom: 'Sinthe', categorie: 'Détergents & lessive', unite: 'unité', qte: 20, seuil: 5, prixAchat: 500, note: 'à préciser' },
    { id: uid(), nom: 'Sachets emballage (habits)', categorie: 'Emballage', unite: 'paquet', qte: 15, seuil: 4, prixAchat: 1667, note: '' },
    { id: uid(), nom: 'Sachets vestes', categorie: 'Emballage', unite: 'paquet', qte: 4, seuil: 2, prixAchat: 2000, note: '' },
    { id: uid(), nom: 'Rame de papier (emballage)', categorie: 'Emballage', unite: 'rame', qte: 2, seuil: 1, prixAchat: 2500, note: '' },
    { id: uid(), nom: 'Étiquettes habits', categorie: 'Fournitures', unite: 'paquet', qte: 10, seuil: 3, prixAchat: 1000, note: '' },
    { id: uid(), nom: 'Agrafes linge', categorie: 'Fournitures', unite: 'boîte', qte: 10, seuil: 3, prixAchat: 2500, note: '' },
    { id: uid(), nom: 'Agrafes emballage', categorie: 'Fournitures', unite: 'boîte', qte: 10, seuil: 3, prixAchat: 200, note: '' },
    { id: uid(), nom: 'Bics (stylos)', categorie: 'Fournitures', unite: 'unité', qte: 5, seuil: 2, prixAchat: 200, note: '' }
  ];
}
function seedArticles() {
  return [
    { id: 'a1', nom: 'Pantalon', emoji: '👖', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a2', nom: 'Chemise', emoji: '👔', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a3', nom: 'Body', emoji: '👕', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a4', nom: 'Blouson', emoji: '🧥', categorie: 'Vêtements', prices: { t1: 500 } },
    { id: 'a5', nom: 'Collant', emoji: '🧦', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a6', nom: 'Costume', emoji: '🤵', categorie: 'Vêtements', prices: { t1: 1000 } },
    { id: 'a7', nom: 'Veste', emoji: '🧥', categorie: 'Vêtements', prices: { t1: 500 } },
    { id: 'a8', nom: 'Cravate', emoji: '👔', categorie: 'Vêtements', prices: { t1: 200 } },
    { id: 'a9', nom: 'Chapeau', emoji: '🎩', categorie: 'Vêtements', prices: { t1: 200 } },
    { id: 'a10', nom: 'Débardeur', emoji: '🎽', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a11', nom: 'Gilet', emoji: '🦺', categorie: 'Vêtements', prices: { t1: 500 } },
    { id: 'a12', nom: 'Culotte', emoji: '🩲', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a13', nom: 'Haut dame', emoji: '👚', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a14', nom: 'Haut homme', emoji: '👕', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a15', nom: 'Jupe', emoji: '👗', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a16', nom: 'Polo', emoji: '👕', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a17', nom: 'Tricot', emoji: '🧶', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a18', nom: 'Tee-shirt', emoji: '👕', categorie: 'Vêtements', prices: { t1: 300 } },
    { id: 'a19', nom: 'Veston', emoji: '🧥', categorie: 'Vêtements', prices: { t1: 500 } },
    { id: 'a20', nom: 'Pull lourd', emoji: '🧥', categorie: 'Vêtements', prices: { t1: 500 } },
    { id: 'a21', nom: 'Boubou homme', emoji: '👚', categorie: 'Traditionnel & Bazin', prices: { t1: 500 } },
    { id: 'a22', nom: 'Complet boubou', emoji: '👚', categorie: 'Traditionnel & Bazin', prices: { t1: 800 } },
    { id: 'a23', nom: 'Complet pagne dame', emoji: '👗', categorie: 'Traditionnel & Bazin', prices: { t1: 1000 } },
    { id: 'a24', nom: 'Bazin blanc (amidon ou non)', emoji: '👚', categorie: 'Traditionnel & Bazin', prices: { t1: 1000 } },
    { id: 'a25', nom: 'Bazin autres couleurs', emoji: '👚', categorie: 'Traditionnel & Bazin', prices: { t1: 800 } },
    { id: 'a26', nom: 'Complet robe dame dentelle', emoji: '👰', categorie: 'Traditionnel & Bazin', prices: { t1: 1500 } },
    { id: 'a27', nom: 'Couette', emoji: '🛏️', categorie: 'Linge de maison', prices: { t1: 2000 } },
    { id: 'a28', nom: 'Drap lourd', emoji: '🛏️', categorie: 'Linge de maison', prices: { t1: 1000 } },
    { id: 'a29', nom: 'Drap léger', emoji: '🛏️', categorie: 'Linge de maison', prices: { t1: 500 } },
    { id: 'a30', nom: 'Couverture', emoji: '🛏️', categorie: 'Linge de maison', prices: { t1: 1000 } },
    { id: 'a31', nom: 'Rideau', emoji: '🪟', categorie: 'Linge de maison', prices: { t1: 500 } },
    { id: 'a32', nom: 'Serviette blanche', emoji: '🧺', categorie: 'Linge de maison', prices: { t1: 1000 } },
    { id: 'a33', nom: 'Serviette autres couleurs', emoji: '🧺', categorie: 'Linge de maison', prices: { t1: 500 } },
    { id: 'a34', nom: 'Nounours grand', emoji: '🧸', categorie: 'Linge de maison', prices: { t1: 3000 } },
    { id: 'a35', nom: 'Nounours moyen', emoji: '🧸', categorie: 'Linge de maison', prices: { t1: 1500 } },
    { id: 'a36', nom: 'Chaussure blanche', emoji: '👟', categorie: 'Chaussures', prices: { t1: 1000 } },
    { id: 'a37', nom: 'Chaussure autres couleurs', emoji: '👟', categorie: 'Chaussures', prices: { t1: 500 } },
    { id: 'a38', nom: 'Ensemble enfant', emoji: '🧒', categorie: 'Enfant', prices: { t1: 500 } },
    { id: 'a39', nom: 'Robe enfant', emoji: '👗', categorie: 'Enfant', prices: { t1: 500 } },
    { id: 'a40', nom: 'Chaussure enfant', emoji: '👟', categorie: 'Enfant', prices: { t1: 500 } }
  ];
}
function defaultData() {
  return {
    articles: seedArticles(),   // catalogue de démarrage (modifiable)
    traitements: seedTraitements(), // 2 services : Laver et repasser / Repasser seulement
    stock: seedStock(),          // consommables et fournitures
    retouches: [],         // catalogue retouches
    forfaits: [],          // catalogue forfaits abonnements
    abonnements: [],       // abonnements actifs (clientId + forfaitId + solde/quota)
    tickets: [],           // tickets dépôt/retrait
    corbeille: [],         // tickets supprimés, récupérables depuis l'historique
    emplacements: [],      // casiers / étagères : {id, code, type, zone, capacite, note}
    clients: [],
    depenses: [],
    closings: [],
    employes: [],          // comptes employés : {id, nom, pin, role:'admin'|'employe', pages:[...]}
    offres: [],            // offres marketing envoyées : {id, clientId, clientNom, tel, type, valeur, message, date, statut}
    settings: {
      name: 'Mon Pressing', adresse: '', tel: '', devise: 'FCFA', tva: 0, indicatif: '225',
      pin: '', relanceAuto: true, slogan: '', logo: '',
      emplacementActif: true, delaiStandard: 2, expressMult: 2,
      categories: ['Vêtements', 'Traditionnel & Bazin', 'Linge de maison', 'Chaussures', 'Enfant'],
      fidelite: { euroParTranche: 1, pointsParTranche: 1, seuilSilver: 100, seuilGold: 500 },
      marketing: { seuilInactifJours: 45 }
    },
    objectifs: { caTTC: 8000, benefice: 2500, tickets: 200, clients: 40 },
    counters: { ticketsByDay: {} } // { '2026-04-29': 5 }
  };
}

function getCur() { return (getData().settings || {}).devise || '€'; }
function payLabel(m) {
  var map = { wave: '🌊 Wave', mtn: '📱 MTN Money', orange: '🟠 Orange Money', moov: '🔵 Moov Money', especes: '💵 Espèces', cb: '💳 CB', mobile: '📱 Mobile', cheque: '📝 Chèque', aucun: '⏸️ Sans', credit: '📒 Crédit', autre: 'Autre' };
  return map[m] || m;
}
function expressMult(d) { d = d || getData(); return parseFloat((d.settings || {}).expressMult) || 2; }
function getTva() { return parseFloat((getData().settings || {}).tva) || 0; }
function numVal(id, def) { var e = ge(id); if (!e) return def; var v = parseFloat(e.value); return isNaN(v) ? def : v; }
function fmt(n) { var c = getCur(); var z = (c === 'FCFA' || c === 'KMF'); return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: z ? 0 : 2, maximumFractionDigits: z ? 0 : 2 }) + ' ' + c; }
function fmtN(n) { var c = getCur(); var z = (c === 'FCFA' || c === 'KMF'); return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: z ? 0 : 2, maximumFractionDigits: z ? 0 : 2 }); }
function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR'); } catch (e) { return d; } }
function fmtDateTime(d) { if (!d) return '—'; try { var dt = new Date(d); return dt.toLocaleDateString('fr-FR') + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return d; } }
function isToday(d) { return d && d.slice(0, 10) === today(); }
function isThisMonth(d) { return d && d.slice(0, 7) === today().slice(0, 7); }
function daysBetween(d1, d2) { return Math.ceil((new Date(d2) - new Date(d1)) / (24 * 3600 * 1000)); }

function toast(msg, type) {
  var c = ge('toastContainer'); if (!c) return;
  var t = document.createElement('div');
  t.className = 'toast toast-' + (type || 'ok');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(function () { if (t.parentNode) t.remove(); }, 3200);
}

/* ══ NUMÉROTATION TICKETS ═══════════════════════════════════════ */
// Format : D26-0429-001-A pour le 1er article du 1er ticket du jour 29/04/26
function genTicketNum() {
  return genTicketNumFor(getData());
}
// Numéro auto-réparateur : max(compteur du jour, plus grand n° réellement utilisé aujourd'hui) + 1
// → même si le compteur a dérivé, deux tickets ne peuvent plus tomber sur le même numéro.
function genTicketNumFor(d) {
  var dt = new Date();
  var yy = String(dt.getFullYear()).slice(-2);
  var mm = String(dt.getMonth() + 1).padStart(2, '0');
  var dd = String(dt.getDate()).padStart(2, '0');
  var key = today();
  if (!d.counters) d.counters = {};
  if (!d.counters.ticketsByDay) d.counters.ticketsByDay = {};
  var prefix = 'D' + yy + '-' + mm + dd + '-';
  var maxUsed = 0;
  (d.tickets || []).forEach(function (t) {
    var s = String(t.numero || '');
    if (s.indexOf(prefix) === 0) {
      var n = parseInt(s.slice(prefix.length, prefix.length + 3), 10);
      if (!isNaN(n) && n > maxUsed) maxUsed = n;
    }
  });
  var cnt = Math.max(d.counters.ticketsByDay[key] || 0, maxUsed) + 1;
  return prefix + String(cnt).padStart(3, '0');
}
function bumpTicketCounter() {
  var d = getData();
  var key = today();
  if (!d.counters.ticketsByDay) d.counters.ticketsByDay = {};
  d.counters.ticketsByDay[key] = (d.counters.ticketsByDay[key] || 0) + 1;
  saveData(d);
}
function articleLetter(n) {
  // 0->A, 1->B, ..., 25->Z, 26->AA
  var s = '';
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

/* ══ STATUTS CYCLE DE VIE ═══════════════════════════════════════ */
// recu -> traitement -> pret -> livre
// + oublie (auto si pret > 30j)
function getTicketStatutAffiche(t) {
  if (t.statut === 'livre') return { code: 'livre', label: 'Livré', cls: 'badge-livre' };
  if (t.statut === 'annule') return { code: 'annule', label: 'Annulé', cls: 'badge-err' };
  // Si prêt depuis +30j → oublié
  if (t.statut === 'pret' && t.dateChangementStatut) {
    var jrs = daysBetween(t.dateChangementStatut, now());
    if (jrs >= 30) return { code: 'oublie', label: 'Oublié', cls: 'badge-oublie' };
  }
  if (t.statut === 'recu') return { code: 'recu', label: 'Reçu', cls: 'badge-recu' };
  if (t.statut === 'traitement') return { code: 'traitement', label: 'En traitement', cls: 'badge-traitement' };
  if (t.statut === 'pret') return { code: 'pret', label: 'Prêt', cls: 'badge-pret' };
  return { code: t.statut || 'recu', label: t.statut || 'Reçu', cls: 'badge-recu' };
}

function getDelayStatus(t) {
  if (!t.delaiRetrait || t.statut === 'livre' || t.statut === 'annule') return null;
  var jrs = daysBetween(today(), t.delaiRetrait);
  if (jrs < 0) return { label: 'Retard ' + Math.abs(jrs) + 'j', cls: 'delay-late' };
  if (jrs === 0) return { label: "Aujourd'hui", cls: 'delay-today' };
  return { label: 'J-' + jrs, cls: 'delay-ok' };
}

function getPaiementStatus(t) {
  var paye = t.paye || 0;
  var ttc = t.ttc || 0;
  if (paye >= ttc - 0.01) return { code: 'solde', label: 'Soldé', cls: 'badge-ok' };
  if (paye > 0) return { code: 'partiel', label: 'Partiel', cls: 'badge-warn' };
  return { code: 'aucun', label: 'Non payé', cls: 'badge-err' };
}

/* ══ LICENCE (algo CoifPro/MagasinPro adapté PRSPRO) ════════════ */
function getFP() {
  return [navigator.language || '', navigator.platform || '', screen.width + 'x' + screen.height, String(screen.colorDepth), Intl.DateTimeFormat().resolvedOptions().timeZone || '', String(navigator.hardwareConcurrency || '')];
}
function fpHash(p) {
  var s = p.join('|') + '|' + _SALT; var h = 5381;
  for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) ^ s.charCodeAt(i); h = h | 0; }
  return Math.abs(h).toString(36).toUpperCase();
}
function fpDrift(a, b) { var d = 0; for (var i = 0; i < b.length; i++) if ((a[i] || '') !== b[i]) d++; return d; }
function _h4(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) ^ s.charCodeAt(i); h = h | 0; }
  return Math.abs(h).toString(36).toUpperCase().padStart(4, '0').slice(-4);
}
function licChecksum(body) { return _h4(body + '|' + _SALT); }
function validateLicKey(key) {
  if (!/^PRSPRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) return false;
  var p = key.split('-');
  return p[3] === licChecksum(p[1] + p[2]);
}
function getLic() { try { return JSON.parse(localStorage.getItem(LIC_KEY)); } catch (e) { return null; } }
function saveLic(key, fp) { localStorage.setItem(LIC_KEY, JSON.stringify({ key: key, fp: fp, at: now() })); }

function initLicence() {
  var fp = getFP();
  var idEl = ge('licId'); if (idEl) idEl.textContent = 'ID: ' + fpHash(fp);
  var stored = getLic();
  if (stored && stored.key && validateLicKey(stored.key) && fpDrift(stored.fp || [], fp) <= 2) {
    ge('licOverlay').classList.add('hidden');
    return true;
  }
  ge('licOverlay').classList.remove('hidden');
  var inp = ge('licInp');
  inp.addEventListener('input', function (e) {
    var v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    var f = '';
    if (v.startsWith('PRSPRO')) v = v.slice(6);
    if (v.length > 0) f = 'PRSPRO-' + v.slice(0, 4);
    if (v.length > 4) f += '-' + v.slice(4, 8);
    if (v.length > 8) f += '-' + v.slice(8, 12);
    e.target.value = f;
  });
  ge('licBtn').addEventListener('click', function () {
    var key = inp.value.trim();
    if (!validateLicKey(key)) {
      ge('licErr').textContent = '❌ Clé invalide. Vérifiez votre clé d\'activation.';
      inp.classList.add('shake');
      setTimeout(function () { inp.classList.remove('shake'); }, 400);
      return;
    }
    saveLic(key, fp);
    var card = document.querySelector('.lic-card');
    card.innerHTML = '<div style="font-size:50px">✅</div><div style="font-size:24px;font-weight:800;color:#0ea5e9;margin-top:12px">Activation réussie !</div><div style="color:#64748b;margin-top:8px">Bienvenue sur PressingPro !</div>';
    setTimeout(function () { ge('licOverlay').classList.add('hidden'); location.reload(); }, 1800);
  });
  return false;
}

/* ══ NAVIGATION ════════════════════════════════════════════════ */
var ALL_PAGES = ['dashboard','depot','encours','rangement','retrait','historique','cloture','tarifs','retouches','abonnements','clients','marketing','depenses','analyse','objectifs','parametres','aide'];
var ROUTES = {
  dashboard: { title: 'Dashboard', render: function(){ try{renderDashboard()}catch(e){console.error(e)} } },
  depot: { title: 'Nouveau dépôt', render: function(){ try{renderDepot()}catch(e){console.error(e)} } },
  encours: { title: 'Tickets en cours', render: function(){ try{renderEnCours()}catch(e){console.error(e)} } },
  rangement: { title: 'Rangement', render: function(){ try{renderRangement()}catch(e){console.error(e)} } },
  retrait: { title: 'Retrait', render: function(){ try{renderRetrait()}catch(e){console.error(e)} } },
  historique: { title: 'Historique', render: function(){ try{renderHistorique()}catch(e){console.error(e)} } },
  cloture: { title: 'Clôture Z', render: function(){ try{renderCloture()}catch(e){console.error(e)} } },
  tarifs: { title: 'Catalogue tarifs', render: function(){ try{renderTarifs()}catch(e){console.error(e)} } },
  retouches: { title: 'Retouches', render: function(){ try{renderRetouches()}catch(e){console.error(e)} } },
  abonnements: { title: 'Abonnements', render: function(){ try{renderAbonnements()}catch(e){console.error(e)} } },
  clients: { title: 'Clients', render: function(){ try{renderClients()}catch(e){console.error(e)} } },
  marketing: { title: 'Marketing & fidélisation', render: function(){ try{renderMarketing()}catch(e){console.error(e)} } },
  depenses: { title: 'Dépenses', render: function(){ try{renderDepenses()}catch(e){console.error(e)} } },
  stock: { title: 'Stock & approvisionnement', render: function(){ try{renderStock()}catch(e){console.error(e)} } },
  analyse: { title: 'Analyse', render: function(){ try{renderAnalyse()}catch(e){console.error(e)} } },
  objectifs: { title: 'Objectifs', render: function(){ try{renderObjectifs()}catch(e){console.error(e)} } },
  employes: { title: 'Employés & accès', render: function(){ try{renderEmployes()}catch(e){console.error(e)} } },
  parametres: { title: 'Paramètres', render: function(){ try{renderParametres()}catch(e){console.error(e)} } },
  aide: { title: 'Aide', render: function () { } }
};

function canAccessPage(page) {
  if (!currentUser) return true; // pas encore de gate (rétro-compat / migration en cours)
  if (currentUser.role === 'admin') return true;
  if (page === 'employes') return false; // toujours réservé à l'Administrateur
  return (currentUser.pages || []).indexOf(page) !== -1;
}

function navigateTo(page) {
  var route = ROUTES[page]; if (!route) return;
  _activePage = page;
  if (!canAccessPage(page)) { toast('⛔ Accès non autorisé pour votre compte', 'err'); return; }
  qs('.page').forEach(function (p) { p.classList.remove('active'); });
  var el = ge('page-' + page); if (el) el.classList.add('active');
  qs('.nav-item').forEach(function (n) { n.classList.toggle('active', n.dataset.page === page); });
  setTxt('pageTitle', route.title);
  ge('sidebar').classList.remove('open');
  route.render();
}

/* ══ WELCOME WIZARD ═════════════════════════════════════════════ */
function wizardNext(step) {
  for (var i = 1; i <= 3; i++) { var el = ge('welcomeStep' + i); if (el) el.classList.toggle('hidden', i !== step); }
}
function wizardFinish() {
  var nom = ge('wizNom').value.trim();
  if (!nom) { toast('Nom du pressing obligatoire', 'err'); return; }
  var d = defaultData();
  d.settings.name = nom;
  d.settings.adresse = ge('wizAdresse').value.trim();
  d.settings.tel = ge('wizTel').value.trim();
  d.settings.devise = ge('wizDevise').value;
  d.settings.tva = numVal('wizTva', 20);
  d.settings.delaiStandard = parseInt(ge('wizDelai').value) || 2;
  saveData(d);
  ge('welcomeOverlay').classList.add('hidden');
  toast('🎉 PressingPro est prêt !', 'ok');
  initApp();
  checkAccessGate();
}

/* ══ EMPLOYÉS / ACCÈS (login gate) ═════════════════════════════ */
var currentUser = null;
var _loginSelectedId = null;

function checkAccessGate() {
  var d = getData();
  if (!d.employes || !d.employes.length) { showCreateAdminGate(); return; }
  var savedId = sessionStorage.getItem('prspro_user');
  if (savedId) {
    var emp = d.employes.filter(function (e) { return e.id === savedId; })[0];
    if (emp) { setCurrentUser(emp); return; }
  }
  showLoginGate();
}

function showCreateAdminGate() {
  ge('loginOverlay').classList.remove('hidden');
  ge('loginTitle').textContent = 'Bienvenue 👋';
  ge('loginSubtitle').textContent = 'Créez votre compte Administrateur pour commencer.';
  ge('loginStepUsers').classList.add('hidden');
  ge('loginStepPin').classList.add('hidden');
  ge('loginStepCreateAdmin').classList.remove('hidden');
  ge('createAdminNom').value = ''; ge('createAdminPin').value = ''; ge('createAdminPinConfirm').value = '';
  setTimeout(function () { ge('createAdminNom').focus(); }, 100);
}

function showLoginGate() {
  currentUser = null;
  ge('loginOverlay').classList.remove('hidden');
  ge('loginTitle').textContent = 'Qui êtes-vous ?';
  ge('loginSubtitle').textContent = 'Sélectionnez votre nom pour accéder à PressingPro.';
  ge('loginStepCreateAdmin').classList.add('hidden');
  ge('loginStepPin').classList.add('hidden');
  ge('loginStepUsers').classList.remove('hidden');
  renderLoginUserList();
}

function renderLoginUserList() {
  var d = getData();
  var list = ge('loginUserList');
  list.innerHTML = d.employes.map(function (e) {
    var initiale = (e.nom || '?')[0].toUpperCase();
    return '<button type="button" class="login-user-btn" data-id="' + e.id + '">'
      + '<span class="login-user-avatar">' + initiale + '</span><span>' + escapeHtml(e.nom) + '</span>'
      + '<span class="login-user-role">' + (e.role === 'admin' ? 'Admin' : 'Employé') + '</span></button>';
  }).join('');
  qs('.login-user-btn').forEach(function (b) {
    b.onclick = function () {
      _loginSelectedId = b.dataset.id;
      ge('loginStepUsers').classList.add('hidden');
      ge('loginStepPin').classList.remove('hidden');
      ge('loginPinInput').value = '';
      ge('loginPinError').classList.add('hidden');
      setTimeout(function () { ge('loginPinInput').focus(); }, 100);
    };
  });
}

function attemptLogin() {
  var d = getData();
  var emp = d.employes.filter(function (e) { return e.id === _loginSelectedId; })[0];
  if (!emp) { showLoginGate(); return; }
  var pin = ge('loginPinInput').value;
  if (pin !== emp.pin) {
    ge('loginPinError').classList.remove('hidden');
    ge('loginPinInput').classList.add('shake');
    setTimeout(function () { ge('loginPinInput').classList.remove('shake'); }, 400);
    return;
  }
  setCurrentUser(emp);
}

function setCurrentUser(emp) {
  currentUser = emp;
  sessionStorage.setItem('prspro_user', emp.id);
  ge('loginOverlay').classList.add('hidden');
  applyUserPermissions();
}

function applyUserPermissions() {
  if (!currentUser) return;
  var badge = ge('currentUserBadge');
  if (badge) {
    badge.classList.remove('hidden');
    setTxt('currentUserName', currentUser.nom + (currentUser.role === 'admin' ? ' · Admin' : ''));
  }
  qs('.nav-item[data-page]').forEach(function (n) {
    var page = n.dataset.page;
    n.style.display = canAccessPage(page) ? '' : 'none';
  });
  var activePage = document.querySelector('.page.active');
  var activeKey = activePage ? activePage.id.replace('page-', '') : null;
  if (!activeKey || !canAccessPage(activeKey)) {
    var fallback = canAccessPage('dashboard') ? 'dashboard' : (currentUser.pages || [])[0];
    navigateTo(fallback || 'dashboard');
  }
}

function logoutUser() {
  sessionStorage.removeItem('prspro_user');
  currentUser = null;
  ge('currentUserBadge').classList.add('hidden');
  showLoginGate();
}

/* ══ CLOCK / DARK MODE / TABS / NOTIFS ═════════════════════════ */
function updateClock() {
  var n = new Date();
  setTxt('topbarClock', n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  setTxt('topbarDate', n.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
}
function initDarkMode() {
  var dm = localStorage.getItem('prspro_dark') === '1';
  if (dm) document.body.classList.add('dark');
  var btn = ge('darkModeToggle'); if (!btn) return;
  btn.textContent = dm ? '☀️' : '🌙';
  btn.onclick = function () {
    document.body.classList.toggle('dark');
    var isDark = document.body.classList.contains('dark');
    localStorage.setItem('prspro_dark', isDark ? '1' : '0');
    btn.textContent = isDark ? '☀️' : '🌙';
  };
}
function initTabs() {
  qs('.tab').forEach(function (t) {
    t.onclick = function () {
      var parent = t.closest('.page'); if (!parent) return;
      parent.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
      parent.querySelectorAll('.tab-content').forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      var target = ge(t.dataset.tab); if (target) target.classList.add('active');
    };
  });
}

function updateNotifs() {
  var d = getData(); var items = [];
  // Tickets prêts à retirer
  var prets = d.tickets.filter(function (t) {
    if (t.statut !== 'pret') return false;
    if (!t.dateChangementStatut) return false;
    var jrs = daysBetween(t.dateChangementStatut, now());
    return jrs < 30;
  });
  prets.forEach(function (t) {
    items.push({ text: '✅ Prêt à retirer : ' + t.numero + ' (' + (t.clientNom || 'Passage') + ')', cls: 'pret' });
  });
  // Tickets oubliés
  var oublies = d.tickets.filter(function (t) {
    if (t.statut !== 'pret') return false;
    if (!t.dateChangementStatut) return false;
    return daysBetween(t.dateChangementStatut, now()) >= 30;
  });
  oublies.forEach(function (t) {
    items.push({ text: '🚨 Oublié : ' + t.numero + ' — ' + (t.clientNom || 'Passage'), cls: 'oublie' });
  });
  // Tickets en retard
  d.tickets.forEach(function (t) {
    if (t.statut !== 'recu' && t.statut !== 'traitement') return;
    if (!t.delaiRetrait) return;
    var jrs = daysBetween(today(), t.delaiRetrait);
    if (jrs < 0) items.push({ text: '⏰ Retard de ' + Math.abs(jrs) + 'j : ' + t.numero, cls: 'warn' });
  });
  // Stock bas / rupture
  (d.stock || []).forEach(function (x) {
    if ((x.qte || 0) <= (x.seuil || 0)) items.push({ text: '📦 Stock bas : ' + x.nom + ' (' + (x.qte || 0) + ' ' + (x.unite || '') + ')', cls: 'warn' });
  });
  var badge = ge('notifBadge');
  if (badge) { badge.textContent = items.length; badge.classList.toggle('hidden', !items.length); }
  var list = ge('notifList');
  if (list) {
    list.innerHTML = items.length
      ? items.slice(0, 20).map(function (it) { return '<div class="notif-item ' + (it.cls || '') + '">' + escapeHtml(it.text) + '</div>'; }).join('')
      : '<div class="notif-item">Aucune notification</div>';
  }
  // Badges sidebar
  var navEnc = ge('navBadgeEncours');
  var nbEncours = d.tickets.filter(function (t) { return t.statut === 'recu' || t.statut === 'traitement'; }).length;
  if (navEnc) { navEnc.textContent = nbEncours; navEnc.classList.toggle('hidden', !nbEncours); }
  var navPret = ge('navBadgePret');
  var nbPret = prets.length + oublies.length;
  if (navPret) { navPret.textContent = nbPret; navPret.classList.toggle('hidden', !nbPret); }
  var navRang = ge('navBadgeRangement');
  var nbSansEmp = emplacementActif()
    ? d.tickets.filter(function (t) { return t.statut === 'pret' && !t.emplacement; }).length : 0;
  if (navRang) { navRang.textContent = nbSansEmp; navRang.classList.toggle('hidden', !nbSansEmp); }
  var navStk = ge('navBadgeStock');
  var nbStk = (d.stock || []).filter(function (x) { return (x.qte || 0) <= (x.seuil || 0); }).length;
  if (navStk) { navStk.textContent = nbStk; navStk.classList.toggle('hidden', !nbStk); }
}

/* ══ SEARCH GLOBAL ══════════════════════════════════════════════ */
function initSearch() {
  var inp = ge('globalSearch'); var res = ge('searchResults');
  if (!inp) return;
  inp.addEventListener('input', function () {
    var q = inp.value.toLowerCase().trim();
    if (q.length < 2) { res.classList.add('hidden'); return; }
    var d = getData(); var items = [];
    // Tickets
    d.tickets.forEach(function (t) {
      if ((t.numero || '').toLowerCase().includes(q) || (t.clientNom || '').toLowerCase().includes(q)
          || (t.emplacement || '').toLowerCase().includes(q))
        items.push({ type: 'Ticket', label: t.numero + ' · ' + (t.clientNom || 'Passage')
          + (t.emplacement ? ' · 📍 ' + t.emplacement : ''), action: 'ticket', id: t.id });
    });
    // Clients
    d.clients.forEach(function (c) {
      var nm = ((c.prenom || '') + ' ' + (c.nom || '')).trim();
      if (nm.toLowerCase().includes(q) || (c.tel || '').includes(q)) items.push({ type: 'Client', label: nm, action: 'page', page: 'clients' });
    });
    // Articles catalogue
    d.articles.forEach(function (a) {
      if ((a.nom || '').toLowerCase().includes(q)) items.push({ type: 'Article', label: a.nom, action: 'page', page: 'tarifs' });
    });
    Object.keys(ROUTES).forEach(function (k) {
      if (ROUTES[k].title.toLowerCase().includes(q)) items.push({ type: 'Page', label: ROUTES[k].title, action: 'page', page: k });
    });
    if (!items.length) { res.classList.add('hidden'); return; }
    res.classList.remove('hidden');
    res.innerHTML = items.slice(0, 10).map(function (it, i) {
      return '<div class="sr-item" data-i="' + i + '"><span class="sr-type">' + it.type + '</span>' + escapeHtml(it.label) + '</div>';
    }).join('');
    res.querySelectorAll('.sr-item').forEach(function (el) {
      el.onclick = function () {
        var i = parseInt(el.dataset.i);
        var it = items[i];
        if (it.action === 'page') navigateTo(it.page);
        else if (it.action === 'ticket') { navigateTo('encours'); setTimeout(function(){ openTicketDetail(it.id); }, 100); }
        res.classList.add('hidden'); inp.value = '';
      };
    });
  });
  document.addEventListener('click', function (e) {
    if (!inp.contains(e.target) && !res.contains(e.target)) res.classList.add('hidden');
  });
}

/* ══ TARIFS / CATALOGUE ════════════════════════════════════════ */
function renderTarifs() {
  var d = getData();
  var grid = ge('tarifGrid'); if (!grid) return;
  if (!d.articles.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--t3)">Aucun article. Cliquez sur "+ Article" pour commencer.<br><br><small>Astuce : créez d\'abord les <strong>types de traitement</strong> (Laver et repasser, Repasser seulement…), puis les <strong>articles</strong> (Chemise, Costume…) avec leur prix par traitement.</small></div>';
  } else {
    grid.innerHTML = d.articles.map(function (a) {
      var rows = '';
      if (d.traitements.length) {
        rows = d.traitements.map(function (t) {
          var prix = (a.prices && a.prices[t.id]) || 0;
          return '<div class="tarif-traitement-row"><span>' + escapeHtml(t.nom) + '</span><span>' + (prix > 0 ? fmt(prix) : '<em style="color:var(--t3)">—</em>') + '</span></div>';
        }).join('');
      } else {
        rows = '<div style="text-align:center;color:var(--t3);font-size:.78rem;padding:8px">Ajoutez d\'abord des traitements</div>';
      }
      return '<div class="tarif-card">'
        + '<div class="t-emoji">' + (a.emoji || '👔') + '</div>'
        + '<h4>' + escapeHtml(a.nom) + '</h4>'
        + '<div style="font-size:.72rem;color:var(--t3);text-align:center;margin-bottom:8px">' + escapeHtml(a.categorie || '') + '</div>'
        + '<div class="tarif-traitements">' + rows + '</div>'
        + ((a.couleurs && a.couleurs.length) ? '<div class="tarif-variantes">' + a.couleurs.map(function (c) { return '<span class="tv-chip">' + escapeHtml(c.nom) + ' : <b>' + fmt(c.prix || 0) + '</b></span>'; }).join('') + '</div>' : '')
        + '<div style="display:flex;gap:5px;margin-top:10px">'
        + '<button class="btn btn-sm" onclick="openArticleModal(\'' + a.id + '\')">✏️</button>'
        + '<button class="btn btn-sm btn-danger" onclick="deleteArticle(\'' + a.id + '\')">🗑</button>'
        + '</div></div>';
    }).join('');
  }
  // Liste des traitements visible en haut
  if (d.traitements.length) {
    var tHtml = '<div class="card" style="grid-column:1/-1;margin-bottom:14px"><h3>⚙️ Types de traitement</h3><div style="display:flex;flex-wrap:wrap;gap:8px">'
      + d.traitements.map(function (t) {
        return '<span class="tag" style="font-size:.84rem;padding:6px 12px">' + escapeHtml(t.nom)
          + ' <button onclick="deleteTraitement(\'' + t.id + '\')">×</button></span>';
      }).join('') + '</div></div>';
    grid.insertAdjacentHTML('beforebegin', tHtml);
    // Nettoyage : retirer les anciennes cards à chaque render
    var old = grid.previousElementSibling;
    while (old && old.previousElementSibling && old.previousElementSibling.classList && old.previousElementSibling.classList.contains('card')) {
      var t2 = old.previousElementSibling;
      t2.remove();
    }
  }
  ge('btnAddArticle').onclick = function () { openArticleModal(null); };
  ge('btnAddTraitement').onclick = function () { openTraitementModal(null); };
}

/* === MODALE TRAITEMENT === */
var _editingTraitId = null;
function openTraitementModal(id) {
  _editingTraitId = id;
  var d = getData();
  var t = id ? d.traitements.filter(function (x) { return x.id === id; })[0] : null;
  setTxt('modalTraitementTitle', t ? '✏️ Modifier traitement' : '+ Nouveau traitement');
  ge('traitNom').value = t ? t.nom : '';
  ge('traitDesc').value = t ? t.desc || '' : '';
  ge('modalTraitement').classList.remove('hidden');
}
function saveTraitement() {
  var d = getData();
  var nom = ge('traitNom').value.trim();
  if (!nom) { toast('Nom obligatoire', 'err'); return; }
  var trait = {
    id: _editingTraitId || uid(),
    nom: nom,
    desc: ge('traitDesc').value.trim()
  };
  if (_editingTraitId) {
    var idx = d.traitements.findIndex(function (x) { return x.id === _editingTraitId; });
    if (idx >= 0) d.traitements[idx] = trait;
  } else {
    d.traitements.push(trait);
  }
  saveData(d);
  ge('modalTraitement').classList.add('hidden');
  toast('💾 Traitement enregistré', 'ok');
  renderTarifs();
}
function deleteTraitement(id) {
  showConfirm('Supprimer ce traitement ?', 'Les prix associés dans les articles seront perdus.', function () {
    var d = getData();
    d.traitements = d.traitements.filter(function (t) { return t.id !== id; });
    // Cleanup prix dans articles
    d.articles.forEach(function (a) {
      if (a.prices && a.prices[id] !== undefined) delete a.prices[id];
    });
    saveData(d);
    toast('Supprimé', 'ok');
    renderTarifs();
  });
}

/* === MODALE ARTICLE === */
var _editingArtId = null;
function openArticleModal(id) {
  _editingArtId = id;
  var d = getData();
  var a = id ? d.articles.filter(function (x) { return x.id === id; })[0] : null;
  setTxt('modalArticleTitle', a ? '✏️ Modifier article' : '+ Nouvel article');
  ge('artNom').value = a ? a.nom : '';
  ge('artEmoji').value = a ? (a.emoji || '👔') : '👔';
  // Catégorie
  var cs = ge('artCategorie');
  cs.innerHTML = (d.settings.categories || []).map(function (c) { return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; }).join('');
  cs.value = a ? a.categorie || '' : (d.settings.categories[0] || '');
  // Auto-détection emoji sur saisie nom
  ge('artNom').oninput = function () {
    if (!a || !a.emoji) {
      var em = detectArticleEmoji(this.value);
      if (em) ge('artEmoji').value = em;
    }
  };
  // Prix par traitement
  var pricesGrid = ge('artPricesGrid');
  if (!d.traitements.length) {
    pricesGrid.innerHTML = '<div style="grid-column:1/-1;color:var(--t3);text-align:center;padding:14px">⚠️ Aucun traitement défini. Créez-en au moins un avant.</div>';
  } else {
    pricesGrid.innerHTML = d.traitements.map(function (t) {
      var p = (a && a.prices && a.prices[t.id]) || '';
      return '<div class="form-group"><label>' + escapeHtml(t.nom) + ' (' + getCur() + ')</label><input type="number" class="art-price" data-tid="' + t.id + '" value="' + p + '" min="0" step="0.5" placeholder="0"></div>';
    }).join('');
  }
  var _cl = ge('artColorsList');
  if (_cl) {
    _cl.innerHTML = (a && a.couleurs && a.couleurs.length) ? a.couleurs.map(function (c) { return artColorRowHtml(c.nom, c.prix); }).join('') : '';
    bindArtColorDel();
    ge('btnAddColorRow').onclick = function () { _cl.insertAdjacentHTML('beforeend', artColorRowHtml('', '')); bindArtColorDel(); };
  }
  ge('modalArticle').classList.remove('hidden');
}
function artColorRowHtml(nom, prix) {
  return '<div class="form-grid art-color-row" style="margin-bottom:6px">'
    + '<input type="text" class="input input-sm art-col-nom" placeholder="Ex: Blanc, Grand, 3 composants…" value="' + escapeHtml(nom || '') + '">'
    + '<div style="display:flex;gap:6px"><input type="number" class="input input-sm art-col-prix" placeholder="Prix (FCFA)" value="' + (prix !== undefined && prix !== '' ? prix : '') + '" step="1" min="0"><button type="button" class="btn btn-sm btn-danger art-col-del">✕</button></div>'
    + '</div>';
}
function bindArtColorDel() { qs('.art-col-del').forEach(function (b) { b.onclick = function () { var r = b.closest('.art-color-row'); if (r) r.remove(); }; }); }
function variantPrixSelected() {
  var d = getData(); var a = d.articles.filter(function (x) { return x.id === _configArtId; })[0]; if (!a || !a.couleurs || !a.couleurs.length) return null;
  var v = ge('confArtColor') ? ge('confArtColor').value : ''; if (!v) return null;
  var c = a.couleurs.filter(function (x) { return x.nom === v; })[0]; return c ? (c.prix || 0) : null;
}
function saveArticle() {
  var d = getData();
  var nom = ge('artNom').value.trim();
  if (!nom) { toast('Nom obligatoire', 'err'); return; }
  var prices = {};
  qs('.art-price').forEach(function (inp) {
    var v = parseFloat(inp.value);
    if (!isNaN(v) && v > 0) prices[inp.dataset.tid] = v;
  });
  var couleurs = [];
  qs('.art-color-row').forEach(function (row) {
    var cn = row.querySelector('.art-col-nom').value.trim();
    var cp = parseFloat(row.querySelector('.art-col-prix').value);
    if (cn) couleurs.push({ nom: cn, prix: isNaN(cp) ? 0 : cp });
  });
  var article = {
    id: _editingArtId || uid(),
    nom: nom,
    emoji: ge('artEmoji').value || '👔',
    categorie: ge('artCategorie').value,
    prices: prices,
    couleurs: couleurs
  };
  if (_editingArtId) {
    var idx = d.articles.findIndex(function (x) { return x.id === _editingArtId; });
    if (idx >= 0) d.articles[idx] = article;
  } else {
    d.articles.push(article);
  }
  saveData(d);
  ge('modalArticle').classList.add('hidden');
  toast('💾 Article enregistré', 'ok');
  renderTarifs();
}
function deleteArticle(id) {
  showConfirm('Supprimer cet article ?', 'Les tickets existants conservent les prix originaux.', function () {
    var d = getData();
    d.articles = d.articles.filter(function (a) { return a.id !== id; });
    saveData(d);
    toast('Supprimé', 'ok');
    renderTarifs();
  });
}

/* Auto-détection emoji selon nom article (FR pressing) */
var ARTICLE_EMOJI_DICT = [
  ['chemise', '👔'], ['cravate', '👔'], ['costume', '🤵'], ['veste', '🧥'],
  ['blouson', '🧥'], ['manteau', '🧥'], ['parka', '🧥'], ['anorak', '🧥'],
  ['pantalon', '👖'], ['jean', '👖'], ['short', '🩳'], ['bermuda', '🩳'],
  ['robe', '👗'], ['jupe', '👗'], ['blouse', '👚'], ['top', '👚'], ['t-shirt', '👕'],
  ['tshirt', '👕'], ['polo', '👕'], ['pull', '🧶'], ['gilet', '🧥'],
  ['cardigan', '🧶'], ['sweat', '👕'],
  // Linge maison
  ['drap', '🛏️'], ['housse', '🛏️'], ['couette', '🛏️'], ['oreiller', '🛏️'],
  ['couverture', '🛏️'], ['plaid', '🛏️'], ['serviette', '🧴'], ['nappe', '🍽️'],
  ['rideau', '🪟'], ['linge', '🧺'], ['voilage', '🪟'],
  // Spécial
  ['cuir', '🧥'], ['daim', '🧥'], ['fourrure', '🐻'], ['mariée', '👰'],
  ['mariage', '👰'], ['soirée', '✨'], ['costume traditionnel', '👘'],
  ['kimono', '👘'], ['boubou', '👘'],
  // Chaussures
  ['chaussure', '👞'], ['basket', '👟'], ['botte', '👢'], ['bottine', '👢'],
  // Accessoires
  ['echarpe', '🧣'], ['écharpe', '🧣'], ['gant', '🧤'], ['casquette', '🧢'],
  ['bonnet', '🧢'], ['chapeau', '🎩'], ['sac', '👜']
];
function detectArticleEmoji(name) {
  if (!name) return '';
  var n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (var i = 0; i < ARTICLE_EMOJI_DICT.length; i++) {
    if (n.indexOf(ARTICLE_EMOJI_DICT[i][0]) !== -1) return ARTICLE_EMOJI_DICT[i][1];
  }
  return '';
}

/* ══ RETOUCHES ══════════════════════════════════════════════════ */
function renderRetouches() {
  var d = getData();
  var grid = ge('retoucheGrid'); if (!grid) return;
  if (!d.retouches || !d.retouches.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--t3)">Aucune retouche. Cliquez sur "+ Nouvelle retouche".</div>';
  } else {
    grid.innerHTML = d.retouches.map(function (r) {
      return '<div class="retouche-card">'
        + '<div class="r-emoji">' + (r.emoji || '✂️') + '</div>'
        + '<div class="r-nom">' + escapeHtml(r.nom) + '</div>'
        + '<div class="r-prix">' + fmt(r.prix) + '</div>'
        + (r.duree ? '<div style="font-size:.72rem;color:var(--t3);margin-top:3px">⏱ ' + r.duree + ' j</div>' : '')
        + (r.desc ? '<div style="font-size:.74rem;color:var(--t2);margin-top:4px">' + escapeHtml(r.desc) + '</div>' : '')
        + '<div style="display:flex;gap:5px;margin-top:8px;justify-content:center">'
        + '<button class="btn btn-sm" onclick="openRetoucheModal(\'' + r.id + '\')">✏️</button>'
        + '<button class="btn btn-sm btn-danger" onclick="deleteRetouche(\'' + r.id + '\')">🗑</button>'
        + '</div></div>';
    }).join('');
  }
  ge('btnAddRetouche').onclick = function () { openRetoucheModal(null); };
}

var _editingRetId = null;
function openRetoucheModal(id) {
  _editingRetId = id;
  var d = getData();
  var r = id ? (d.retouches || []).filter(function (x) { return x.id === id; })[0] : null;
  setTxt('modalRetoucheTitle', r ? '✏️ Modifier retouche' : '+ Nouvelle retouche');
  ge('retNom').value = r ? r.nom : '';
  ge('retEmoji').value = r ? (r.emoji || '✂️') : '✂️';
  ge('retPrix').value = r ? r.prix : '';
  ge('retDuree').value = r ? r.duree || 3 : 3;
  ge('retDesc').value = r ? r.desc || '' : '';
  ge('modalRetouche').classList.remove('hidden');
}
function saveRetouche() {
  var d = getData();
  if (!d.retouches) d.retouches = [];
  var nom = ge('retNom').value.trim();
  var prix = parseFloat(ge('retPrix').value);
  if (!nom || isNaN(prix) || prix < 0) { toast('Nom et prix obligatoires', 'err'); return; }
  var r = {
    id: _editingRetId || uid(),
    nom: nom,
    emoji: ge('retEmoji').value || '✂️',
    prix: prix,
    duree: parseInt(ge('retDuree').value) || 3,
    desc: ge('retDesc').value.trim()
  };
  if (_editingRetId) {
    var idx = d.retouches.findIndex(function (x) { return x.id === _editingRetId; });
    if (idx >= 0) d.retouches[idx] = r;
  } else {
    d.retouches.push(r);
  }
  saveData(d);
  ge('modalRetouche').classList.add('hidden');
  toast('💾 Retouche enregistrée', 'ok');
  renderRetouches();
}
function deleteRetouche(id) {
  showConfirm('Supprimer cette retouche ?', '', function () {
    var d = getData();
    d.retouches = (d.retouches || []).filter(function (r) { return r.id !== id; });
    saveData(d);
    toast('Supprimée', 'ok');
    renderRetouches();
  });
}

/* ══ NOUVEAU DÉPÔT ═════════════════════════════════════════════ */
function computeSoldePrecedent(d, clientId) {
  var res = { total: 0, creance: 0, tickets: [] };
  if (!clientId) return res;
  var c = d.clients.filter(function (x) { return x.id === clientId; })[0];
  res.creance = c ? (c.creance || 0) : 0;
  d.tickets.forEach(function (t) {
    if (t.clientId === clientId && t.statut !== 'livre' && t.statut !== 'annule') {
      var reste = Math.max(0, (t.ttc || 0) - (t.paye || 0));
      if (reste > 0) { res.tickets.push({ id: t.id, numero: t.numero, reste: reste }); res.total += reste; }
    }
  });
  res.total += res.creance;
  return res;
}
function renderDepotClientInfo() {
  var el = ge('depotClientInfo'); if (!el) return;
  var cid = ge('depotClient') ? ge('depotClient').value : '';
  if (!cid) { el.style.display = 'none'; el.innerHTML = ''; return; }
  var d = getData();
  var open = d.tickets.filter(function (t) { return t.clientId === cid && t.statut !== 'livre' && t.statut !== 'annule'; });
  var sp = computeSoldePrecedent(d, cid);
  if (!open.length && sp.total <= 0) { el.style.display = 'none'; el.innerHTML = ''; return; }
  var html = '';
  if (open.length) {
    html += '<div style="font-weight:700;margin-bottom:3px">\uD83D\uDCCC Déjà au pressing pour ce client :</div>';
    open.forEach(function (t) {
      var reste = Math.max(0, (t.ttc || 0) - (t.paye || 0));
      html += '<div style="display:flex;justify-content:space-between;gap:8px;font-size:.8rem;padding:2px 0">'
        + '<span>' + escapeHtml(t.numero) + ' \u00B7 ' + (t.lignes || []).length + ' vêtement(s)' + (t.retraitPartiel ? ' \u00B7 retrait partiel' : '') + '</span>'
        + '<span style="font-weight:700;color:' + (reste > 0 ? '#c0392b' : '#16a34a') + '">' + (reste > 0 ? ('reste ' + fmt(reste)) : 'payé') + '</span>'
        + '</div>';
    });
  }
  if (sp.total > 0) {
    html += '<div style="margin-top:5px;color:#92400e;font-weight:700;font-size:.82rem">\uD83D\uDCB0 Solde précédent : ' + fmt(sp.total) + ' — ajouté au total de ce dépôt ci-dessous.</div>';
  }
  el.innerHTML = html; el.style.display = '';
}
function renderDepot() {
  var d = getData();
  // Numéro suggéré
  setTxt('depotNum', genTicketNum());
  // Sélecteur client
  var cSel = ge('depotClient');
  if (cSel) {
    var val = cSel.value;
    cSel.innerHTML = '<option value="">👤 Client de passage</option>';
    d.clients.forEach(function (c) {
      var o = document.createElement('option'); o.value = c.id;
      o.textContent = ((c.prenom || '') + ' ' + (c.nom || '')).trim() + (c.tel ? ' · ' + c.tel : '');
      cSel.appendChild(o);
    });
    cSel.value = val || '';
    cSel.onchange = function () { renderDepotClientInfo(); calcDepot(); };
  }
  renderDepotClientInfo();
  // Filtres catégorie
  var cats = d.settings.categories || [];
  var filtersEl = ge('depotFilters');
  if (filtersEl) {
    filtersEl.innerHTML = '<button class="filter-btn active" data-cat="">Tous</button>'
      + cats.map(function (c) { return '<button class="filter-btn" data-cat="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>'; }).join('')
      + '<button class="filter-btn" data-cat="__retouche">✂️ Retouches</button>';
    filtersEl.querySelectorAll('.filter-btn').forEach(function (b) {
      b.onclick = function () {
        filtersEl.querySelectorAll('.filter-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderArticleGrid();
      };
    });
  }
  // Délai par défaut : aujourd'hui + delaiStandard
  var delaiEl = ge('depotDelai');
  if (delaiEl && !delaiEl.value) {
    var dt = new Date();
    dt.setDate(dt.getDate() + (d.settings.delaiStandard || 2));
    delaiEl.value = dt.toISOString().slice(0, 10);
  }
  renderArticleGrid();
  renderDepotPanel();
  calcDepot();
  // Bindings
  var discEl = ge('depotDiscount'); if (discEl) discEl.oninput = calcDepot;
  var discTypeEl = ge('depotDiscountType'); if (discTypeEl) discTypeEl.onchange = calcDepot;
  var acompteEl = ge('depotAcompte'); if (acompteEl) acompteEl.oninput = calcDepot;
  qs('.pay-mode').forEach(function (b) {
    b.onclick = function () {
      qs('.pay-mode').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      depot.paiement = b.dataset.pay;
    };
  });
  qs('.express-opt').forEach(function (b) {
    b.onclick = function () { depot.expressMode = b.dataset.exp || null; applyExpressUI(); calcDepot(); };
  });
  applyExpressUI();
  var oOff = ge('depotOldOff'), oOn = ge('depotOldOn'), oPanel = ge('depotOldPanel');
  if (oOff) oOff.onclick = function () { depot.oldMode = false; oOff.classList.add('active'); if (oOn) oOn.classList.remove('active'); if (oPanel) oPanel.style.display = 'none'; };
  if (oOn) oOn.onclick = function () { depot.oldMode = true; oOn.classList.add('active'); if (oOff) oOff.classList.remove('active'); if (oPanel) oPanel.style.display = ''; var dd = ge('depotOldDate'); if (dd && !dd.value) dd.value = today(); };
  ge('btnCancelDepot').onclick = resetDepot;
  ge('btnValiderDepot').onclick = validateDepot;
  var searchEl = ge('depotSearch');
  if (searchEl) searchEl.oninput = renderArticleGrid;
  ge('btnNewClientQuick').onclick = function () { openClientModal(null); };
}

function renderArticleGrid() {
  var d = getData();
  var grid = ge('articleGrid'); if (!grid) return;
  var q = (ge('depotSearch') ? ge('depotSearch').value : '').toLowerCase().trim();
  var activeBtn = document.querySelector('.depot-filters .filter-btn.active');
  var activeCat = activeBtn ? (activeBtn.dataset.cat || '') : '';

  // Mode retouche : afficher les retouches
  if (activeCat === '__retouche') {
    var retouches = (d.retouches || []).filter(function (r) {
      return !q || (r.nom || '').toLowerCase().includes(q);
    });
    if (!retouches.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--t3)">Aucune retouche disponible. Créez-en dans la page <strong>Retouches</strong>.</div>';
      return;
    }
    grid.innerHTML = retouches.map(function (r) {
      return '<button class="article-btn" onclick="addRetoucheToDepot(\'' + r.id + '\')">'
        + '<div class="a-emoji">' + (r.emoji || '✂️') + '</div>'
        + '<div class="a-nom">' + escapeHtml(r.nom) + '</div>'
        + '<div class="a-prix">' + fmt(r.prix) + '</div>'
        + '</button>';
    }).join('');
    return;
  }

  // Articles normaux
  var articles = d.articles.filter(function (a) {
    if (activeCat && a.categorie !== activeCat) return false;
    if (q && !(a.nom || '').toLowerCase().includes(q)) return false;
    return true;
  });

  if (!articles.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--t3)">Aucun article. Créez votre catalogue dans <strong>Catalogue tarifs</strong>.</div>';
    return;
  }

  grid.innerHTML = articles.map(function (a) {
    // Prix minimum trouvé
    var prices = Object.values(a.prices || {}).filter(function (x) { return x > 0; });
    var minP = prices.length ? Math.min.apply(null, prices) : 0;
    return '<button class="article-btn" onclick="openConfigArticle(\'' + a.id + '\')">'
      + '<div class="a-emoji">' + (a.emoji || '👔') + '</div>'
      + '<div class="a-nom">' + escapeHtml(a.nom) + '</div>'
      + '<div class="a-prix">' + (minP > 0 ? 'dès ' + fmt(minP) : '<em>—</em>') + '</div>'
      + '</button>';
  }).join('');
}

/* === MODALE CONFIG ARTICLE (au moment du dépôt) === */
var _configArtId = null;
function openConfigArticle(articleId) {
  _configArtId = articleId;
  var d = getData();
  var a = d.articles.filter(function (x) { return x.id === articleId; })[0];
  if (!a) return;
  ge('confArtTitle').textContent = '⚙️ ' + a.nom;
  ge('confArtPreview').textContent = a.emoji || '👔';
  // Traitements disponibles (avec prix > 0)
  var sel = ge('confArtTraitement');
  var availableTraits = d.traitements.filter(function (t) {
    return a.prices && a.prices[t.id] && a.prices[t.id] > 0;
  });
  if (!availableTraits.length) {
    sel.innerHTML = '<option value="">⚠️ Aucun prix défini pour cet article</option>';
  } else {
    sel.innerHTML = availableTraits.map(function (t) {
      return '<option value="' + t.id + '">' + escapeHtml(t.nom) + ' — ' + fmt(a.prices[t.id]) + '</option>';
    }).join('');
  }
  var _colRow = ge('confArtColorRow'), _colSel = ge('confArtColor');
  if (_colRow && _colSel) {
    if (a.couleurs && a.couleurs.length) {
      _colRow.style.display = '';
      _colSel.innerHTML = a.couleurs.map(function (c) { return '<option value="' + escapeHtml(c.nom) + '">' + escapeHtml(c.nom) + ' — ' + fmt(c.prix || 0) + '</option>'; }).join('');
      _colSel.value = a.couleurs[0].nom; _colSel.onchange = updateConfArtPrice;
    } else { _colRow.style.display = 'none'; _colSel.innerHTML = ''; }
  }
  ge('confArtQte').value = 1;
  ge('confArtNote').value = '';
  updateConfArtPrice();
  sel.onchange = updateConfArtPrice;
  ge('confArtQte').oninput = updateConfArtPrice;
  ge('modalConfigArticle').classList.remove('hidden');
}
function updateConfArtPrice() {
  var d = getData();
  var a = d.articles.filter(function (x) { return x.id === _configArtId; })[0];
  if (!a) return;
  var traitId = ge('confArtTraitement').value;
  var qte = parseInt(ge('confArtQte').value) || 1;
  var _vp = variantPrixSelected();
  var prix = (_vp !== null) ? _vp : Math.max(0, (a.prices && a.prices[traitId]) || 0);
  ge('confArtPriceBox').innerHTML = '<strong>Total : ' + fmt(prix * qte) + '</strong> (' + qte + ' × ' + fmt(prix) + ')';
}
function addConfArtToDepot() {
  var d = getData();
  var a = d.articles.filter(function (x) { return x.id === _configArtId; })[0];
  if (!a) return;
  var traitId = ge('confArtTraitement').value;
  if (!traitId) { toast('Choisissez un traitement', 'err'); return; }
  var trait = d.traitements.filter(function (t) { return t.id === traitId; })[0];
  var qte = parseInt(ge('confArtQte').value) || 1;
  var note = ge('confArtNote').value.trim();
  var _colName = (a.couleurs && a.couleurs.length && ge('confArtColor')) ? ge('confArtColor').value : '';
  var _vp2 = variantPrixSelected();
  var prix = (_vp2 !== null) ? _vp2 : Math.max(0, (a.prices[traitId] || 0));
  // Ajouter qte fois (chaque article a son ID lettre individuel)
  for (var i = 0; i < qte; i++) {
    depot.lines.push({
      id: uid(),
      type: 'article',
      articleId: a.id,
      articleNom: a.nom + (_colName ? ' (' + _colName + ')' : ''),
      couleur: _colName,
      emoji: a.emoji || '👔',
      categorie: a.categorie || '',
      traitementId: traitId,
      traitementNom: trait ? trait.nom : '',
      prix: prix,
      qte: 1,
      note: note,
      tagId: '' // sera assigné à la validation
    });
  }
  ge('modalConfigArticle').classList.add('hidden');
  renderDepotPanel();
  calcDepot();
}

function addRetoucheToDepot(retoucheId) {
  var d = getData();
  var r = (d.retouches || []).filter(function (x) { return x.id === retoucheId; })[0];
  if (!r) return;
  depot.lines.push({
    id: uid(),
    type: 'retouche',
    retoucheId: r.id,
    articleNom: r.nom,
    emoji: r.emoji || '✂️',
    categorie: 'Retouche',
    traitementNom: 'Couture',
    prix: r.prix,
    qte: 1,
    note: '',
    tagId: ''
  });
  renderDepotPanel();
  calcDepot();
}

function renderDepotPanel() {
  var el = ge('depotArticles');
  if (!depot.lines.length) {
    el.innerHTML = '<div class="depot-empty">Cliquez sur un article pour l\'ajouter au dépôt.</div>';
    return;
  }
  // Calculer les tags A, B, C... pour preview (réel = à la validation)
  el.innerHTML = depot.lines.map(function (l, i) {
    var tag = articleLetter(i);
    return '<div class="depot-line">'
      + '<div class="dl-top">'
      + '<div class="dl-emoji">' + (l.emoji || '👔') + '</div>'
      + '<div class="dl-id">' + tag + '</div>'
      + '<div class="dl-nom">' + escapeHtml(l.articleNom) + '</div>'
      + '<div class="dl-prix">' + fmt(l.prix) + '</div>'
      + '<button class="dl-remove" onclick="removeDepotLine(\'' + l.id + '\')">✕</button>'
      + '</div>'
      + '<div class="dl-options">'
      + '<span class="dl-traitement">⚙️ ' + escapeHtml(l.traitementNom || 'Standard') + '</span>'
      + (l.note ? '<span class="dl-note">📝 ' + escapeHtml(l.note) + '</span>' : '')
      + '</div></div>';
  }).join('');
}

function removeDepotLine(id) {
  depot.lines = depot.lines.filter(function (l) { return l.id !== id; });
  renderDepotPanel();
  calcDepot();
}

function calcDepot() {
  var _cd = getData();
  var _mult = depot.expressMode ? expressMult(_cd) : 1;
  var _baseHt = depot.lines.reduce(function (s, l) { return s + l.prix * l.qte; }, 0);
  var ht = _baseHt * _mult;
  var discEl = ge('depotDiscount'), discTypeEl = ge('depotDiscountType');
  var discVal = discEl ? parseFloat(discEl.value) || 0 : 0;
  var discType = discTypeEl ? discTypeEl.value : 'pct';
  var disc = discType === 'pct' ? ht * discVal / 100 : Math.min(discVal, ht);
  var afterDisc = Math.max(0, ht - disc);
  var tvaRate = getTva();
  var tva = afterDisc * (tvaRate / 100);
  var ttcArticles = afterDisc + tva;
  var _sp = computeSoldePrecedent(_cd, ge('depotClient') ? ge('depotClient').value : '').total;
  var ttc = ttcArticles + _sp;
  var acompte = parseFloat(ge('depotAcompte').value) || 0;
  if (acompte > ttc) acompte = ttc;
  var solde = ttc - acompte;

  setTxt('depotHT', fmt(ht));
  setTxt('depotTVA', fmt(tva));
  setTxt('depotTTC', fmt(ttc));
  setTxt('depotTvaRate', tvaRate);
  var exEl = ge('dlineExpress');
  if (exEl) { exEl.style.display = depot.expressMode ? 'flex' : 'none'; setTxt('depotExpressShow', '+' + fmt(_baseHt * (_mult - 1))); }
  var dlEl = ge('dlineDiscount');
  if (dlEl) { dlEl.style.display = disc > 0 ? 'flex' : 'none'; setTxt('depotDiscountShow', '-' + fmt(disc)); }
  var slEl = ge('dlineSolde');
  if (slEl) { slEl.style.display = _sp > 0 ? 'flex' : 'none'; setTxt('depotSoldePrecShow', '+' + fmt(_sp)); }
  ge('depotSolde').value = fmtN(solde) + ' ' + getCur();

  depot._ht = ht; depot._disc = disc; depot._tva = tva; depot._ttc = ttc;
  depot._acompte = acompte; depot._solde = solde; depot._soldePrec = _sp;
  depot._mult = _mult; depot._baseHt = _baseHt;
}

function validateDepot() {
  if (!depot.lines.length) { toast('Ajoutez au moins un article', 'err'); return; }
  calcDepot();
  var d = getData();
  var clientId = ge('depotClient').value;
  var clientNom = '';
  if (clientId) {
    var c = d.clients.filter(function (x) { return x.id === clientId; })[0];
    if (c) clientNom = ((c.prenom || '') + ' ' + (c.nom || '')).trim();
  }
  if (!clientNom) clientNom = 'Passage';

  // Solde précédent (créance + restes des tickets encore ouverts) regroupé sur cette facture
  var _spInfo = computeSoldePrecedent(d, clientId);
  var _dette = _spInfo.total;

  // Numéro ticket définitif
  var numero = genTicketNum();
  // Assigner les tags ABC...
  var lignesFinal = depot.lines.map(function (l, i) {
    return Object.assign({}, l, { prix: l.prix * (depot._mult || 1), tagId: numero + '-' + articleLetter(i) });
  });

  // Reprise d'une ancienne commande : date, statut de départ, état du paiement
  var _old = depot.oldMode;
  var _stamp = (_old && ge('depotOldDate') && ge('depotOldDate').value) ? new Date(ge('depotOldDate').value + 'T12:00:00').toISOString() : now();
  var _startStatut = (_old && ge('depotOldStatut')) ? (ge('depotOldStatut').value || 'recu') : 'recu';
  var _payeAmount = depot._acompte;
  var _payeHist = depot._acompte > 0 ? [{ date: now(), montant: depot._acompte, mode: depot.paiement, label: 'Acompte au dépôt' }] : [];
  if (_old && ge('depotOldPaid')) {
    var _op = ge('depotOldPaid').value;
    if (_op === 'oui') { _payeAmount = depot._ttc; _payeHist = [{ date: _stamp, montant: depot._ttc, mode: depot.paiement, label: 'Réglé (reprise)' }]; }
    else if (_op === 'non') { _payeAmount = 0; _payeHist = []; }
    else { _payeHist = depot._acompte > 0 ? [{ date: _stamp, montant: depot._acompte, mode: depot.paiement, label: 'Avance (reprise)' }] : []; }
  }

  var ticket = {
    id: uid(),
    numero: numero,
    date: _stamp,
    clientId: clientId || null,
    clientNom: clientNom,
    lignes: lignesFinal,
    ht: depot._ht,
    remise: depot._disc,
    tva: depot._tva,
    ttc: depot._ttc,
    soldePrecedent: _dette,
    paye: _payeAmount,
    paiement: depot.paiement === 'aucun' ? null : depot.paiement,
    paiementsHist: _payeHist,
    delaiRetrait: ge('depotDelai').value || null,
    note: ge('depotNote').value.trim(),
    express: !!depot.expressMode,
    expressMode: depot.expressMode || null,
    expressMult: depot._mult || 1,
    statut: _startStatut,
    dateChangementStatut: _stamp,
    reprise: _old || false
  };
  d.tickets.push(ticket);
  if (_dette > 0 && clientId) {
    var _cx = d.clients.findIndex(function (c) { return c.id === clientId; }); if (_cx >= 0) d.clients[_cx].creance = 0;
    _spInfo.tickets.forEach(function (ot) { var _oi = d.tickets.findIndex(function (t) { return t.id === ot.id; }); if (_oi >= 0) { d.tickets[_oi].paye = d.tickets[_oi].ttc; d.tickets[_oi].soldeReporteVers = numero; } });
  }
  // Compteur du jour persisté sur le MÊME objet d (avant : bumpTicketCounter sauvegardait
  // une autre copie, écrasée par le saveData final → tous les tickets sortaient en 001)
  if (!d.counters) d.counters = {};
  if (!d.counters.ticketsByDay) d.counters.ticketsByDay = {};
  var _seq = parseInt(String(numero).slice(-3), 10) || 0;
  var _k = today();
  d.counters.ticketsByDay[_k] = Math.max(d.counters.ticketsByDay[_k] || 0, _seq);

  // Fidélité (sur acompte payé seulement à ce stade)
  if (clientId && depot._acompte > 0) {
    var ci = d.clients.findIndex(function (c) { return c.id === clientId; });
    if (ci >= 0) {
      var fid = d.settings.fidelite || {};
      var pts = Math.floor((depot._acompte / (fid.euroParTranche || 1)) * (fid.pointsParTranche || 1));
      d.clients[ci].points = (d.clients[ci].points || 0) + pts;
      d.clients[ci].totalCA = (d.clients[ci].totalCA || 0) + depot._acompte;
      d.clients[ci].visites = (d.clients[ci].visites || 0) + 1;
      d.clients[ci].derniereVisite = ticket.date;
    }
  }

  saveData(d);
  toast('✅ Ticket ' + numero + ' créé · ' + fmt(depot._ttc), 'ok');
  // Imprimer ticket dépôt
  printTicketDepot(ticket);
  resetDepot();
  updateNotifs();
  // Aller voir en cours
  setTimeout(function () { navigateTo('encours'); }, 600);
}

function resetDepot() {
  depot = { lines: [], paiement: 'especes', expressMode: null, oldMode: false };
  var _oo=ge('depotOldOff'),_on=ge('depotOldOn'),_op=ge('depotOldPanel'); if(_oo){_oo.classList.add('active');} if(_on){_on.classList.remove('active');} if(_op){_op.style.display='none';}
  qs('.pay-mode').forEach(function (b) { b.classList.toggle('active', b.dataset.pay === 'especes'); });
  applyExpressUI();
  var di = ge('depotDiscount'); if (di) di.value = 0;
  var dn = ge('depotNote'); if (dn) dn.value = '';
  var ac = ge('depotAcompte'); if (ac) ac.value = 0;
  setTxt('depotNum', genTicketNum());
  renderDepotPanel();
  calcDepot();
}

function applyExpressUI() {
  var opts = qs('.express-opt'); if (!opts.length) return;
  opts.forEach(function (b) { b.classList.toggle('active', (b.dataset.exp || '') === (depot.expressMode || '')); });
  if (depot.expressMode) {
    var del = ge('depotDelai');
    if (del) { var dt = new Date(); if (depot.expressMode === 'lendemain') dt.setDate(dt.getDate() + 1); del.value = dt.toISOString().slice(0, 10); }
  }
}

/* Impression ticket dépôt (à donner au client) */
function printTicketDepot(t) {
  var d = getData();
  var s = d.settings || {};
  var win = window.open('', '_blank', 'width=800,height=900');
  if (!win) { toast('Popup bloquée — autorisez les popups', 'warn'); return; }
  var modePaie = t.paiement ? payLabel(t.paiement) : '\u23F8\uFE0F Non réglé au dépôt';
  var rows = (t.lignes || []).map(function (l) {
    var ref = l.tagId ? String(l.tagId).split('-').slice(-1)[0] : '';
    return '<tr><td class="c">' + escapeHtml(ref) + '</td>'
      + '<td>' + escapeHtml(l.articleNom || '') + (l.note ? '<div class="note">\uD83D\uDCDD ' + escapeHtml(l.note) + '</div>' : '') + '</td>'
      + '<td>' + escapeHtml(l.traitementNom || '') + '</td>'
      + '<td class="c">' + (l.qte || 1) + '</td>'
      + '<td class="r">' + fmt((l.prix || 0) * (l.qte || 1)) + '</td></tr>';
  }).join('');
  var logo = s.logo ? '<img src="' + s.logo + '" alt="logo" style="height:80px;margin-bottom:6px">' : '';
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reçu ' + escapeHtml(t.numero || '') + '</title><style>'
    + '@page{size:A4;margin:16mm}*{box-sizing:border-box}'
    + 'body{font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;max-width:720px;margin:0 auto;padding:10px}'
    + '.head{text-align:center;border-bottom:3px solid #1e3a8a;padding-bottom:12px;margin-bottom:14px}'
    + '.head .nom{font-size:26px;font-weight:bold;color:#1e3a8a;letter-spacing:1px}'
    + '.head .sub{font-size:14px;color:#444;margin-top:3px}'
    + '.recu-title{text-align:center;font-size:15px;letter-spacing:3px;color:#666;margin:6px 0}'
    + '.num{text-align:center;font-size:24px;font-weight:bold;border:2px solid #111;border-radius:8px;padding:8px;margin:10px auto;max-width:340px;letter-spacing:2px}'
    + '.meta{display:flex;justify-content:space-between;font-size:14px;margin:10px 2px}'
    + '.express{text-align:center;background:#fef3c7;border:2px solid #f59e0b;border-radius:6px;padding:7px;font-weight:bold;margin:10px 0}'
    + 'table{width:100%;border-collapse:collapse;margin:12px 0}'
    + 'th{background:#1e3a8a;color:#fff;font-size:13px;padding:8px;text-align:left}'
    + 'td{border-bottom:1px solid #ddd;padding:8px;font-size:14px;vertical-align:top}'
    + 'td.c,th.c{text-align:center}td.r,th.r{text-align:right}'
    + '.note{font-style:italic;color:#666;font-size:12px;margin-top:2px}'
    + '.totaux{margin-left:auto;max-width:360px}'
    + '.totaux .row{display:flex;justify-content:space-between;padding:5px 2px;font-size:15px}'
    + '.totaux .ttc{font-size:19px;font-weight:bold;border-top:2px solid #111;padding-top:8px;margin-top:4px}'
    + '.paie{margin-top:10px;padding:11px 14px;background:#eef2fb;border:1px solid #1e3a8a;border-radius:6px;font-size:15px}'
    + '.reste{color:#c0392b;font-weight:bold}'
    + '.retrait{text-align:center;margin-top:12px;padding:9px;background:#e0f2fe;border:1px solid #0ea5e9;border-radius:6px;font-weight:bold}'
    + '.conditions{margin-top:14px;padding:11px 14px;border:2px solid #c0392b;border-radius:6px;background:#fdf1f0}'
    + '.conditions .ct{font-weight:bold;color:#c0392b;font-size:14px;margin-bottom:6px;letter-spacing:1px}'
    + '.conditions ul{margin:0;padding-left:18px}'
    + '.conditions li{font-size:13.5px;color:#111;padding:2px 0}'
    + '.foot{text-align:center;margin-top:20px;font-size:12px;color:#555;border-top:1px dashed #aaa;padding-top:10px}'
    + 'button{margin:18px auto;display:block;padding:11px 22px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer}'
    + '@media print{button{display:none}body{max-width:none}}'
    + '</style></head><body>'
    + '<div class="head">' + logo + '<div class="nom">' + escapeHtml(s.name || '') + '</div>'
    + (s.adresse ? '<div class="sub">' + escapeHtml(s.adresse) + '</div>' : '')
    + (s.tel ? '<div class="sub">\uD83D\uDCDE ' + escapeHtml(s.tel) + '</div>' : '') + '</div>'
    + '<div class="recu-title">REÇU DE DÉPÔT</div>'
    + '<div class="num">\uD83E\uDDFE ' + escapeHtml(t.numero || '') + '</div>'
    + (t.express ? '<div class="express">\u26A1 EXPRESS · ' + (t.expressMode === 'lendemain' ? 'Retrait le lendemain' : 'Retrait le jour même') + ' (×' + (t.expressMult || 2) + ')</div>' : '')
    + '<div class="meta"><span>' + fmtDateTime(t.date) + '</span><span>Client : <strong>' + escapeHtml(t.clientNom || 'Passage') + '</strong></span></div>'
    + '<table><thead><tr><th class="c">Réf</th><th>Article</th><th>Traitement</th><th class="c">Qté</th><th class="r">Montant</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '<div class="totaux">'
    + '<div class="row"><span>Sous-total HT</span><span>' + fmt(t.ht || 0) + '</span></div>'
    + (t.remise > 0 ? '<div class="row"><span>Remise</span><span>-' + fmt(t.remise) + '</span></div>' : '')
    + '<div class="row"><span>TVA</span><span>' + fmt(t.tva || 0) + '</span></div>'
    + (t.soldePrecedent > 0 ? '<div class="row"><span>Solde précédent (dépôts antérieurs)</span><span>+' + fmt(t.soldePrecedent) + '</span></div>' : '')
    + '<div class="row ttc"><span>TOTAL TTC</span><span>' + fmt(t.ttc || 0) + '</span></div></div>'
    + '<div class="paie"><strong>\uD83D\uDCB3 Mode de paiement :</strong> ' + modePaie
    + ((t.paye || 0) > 0 ? '<br><strong>Acompte versé :</strong> ' + fmt(t.paye) + '<br><span class="reste">Reste à payer : ' + fmt((t.ttc || 0) - (t.paye || 0)) + '</span>' : '')
    + '</div>'
    + (t.delaiRetrait ? '<div class="retrait">\uD83D\uDCC5 Retrait prévu : ' + fmtDate(t.delaiRetrait) + '</div>' : '')
    + (t.emplacement ? '<div class="retrait">\uD83D\uDCCD Emplacement en boutique : <strong>' + escapeHtml(t.emplacement) + '</strong></div>' : '')
    + '<div class="conditions"><div class="ct">Conditions :</div><ul>'
    + '<li>Délai gratuit : 30 jours</li>'
    + '<li>Après 30 jours : 100f / article / semaine</li>'
    + '<li>Après 90 jours : article considéré comme abandonné</li>'
    + '</ul></div>'
    + '<div class="foot">\u26A0\uFE0F Conservez ce reçu pour récupérer vos articles — sans reçu, une pièce d\'identité sera demandée.<br>Merci de votre confiance !</div>'
    + '<button onclick="window.print()">\uD83D\uDDA8\uFE0F Imprimer</button>'
    + '</body></html>';
  win.document.write(h);
  win.document.close();
}

/* ══ RANGEMENT — CASIERS ET ÉTAGÈRES ═══════════════════════════
   Suggestion d'un client : dès que le linge est prêt, on le range
   dans un casier identifié (A1, B3, portant P2…). Le jour du
   retrait, le gérant lit l'emplacement dans le logiciel au lieu de
   fouiller la réserve.
   L'emplacement est porté par le TICKET, pas par l'article : un
   pressing range une commande entière au même endroit.
   ══════════════════════════════════════════════════════════════ */

function emplacementActif() {
  var s = getData().settings || {};
  return s.emplacementActif !== false;
}
function getEmplacements() {
  var d = getData();
  return (d.emplacements || []).slice().sort(function (a, b) {
    return String(a.code || '').localeCompare(String(b.code || ''), 'fr', { numeric: true });
  });
}
function empParCode(code) {
  if (!code) return null;
  var c = String(code).trim().toUpperCase();
  return getEmplacements().filter(function (e) { return String(e.code).toUpperCase() === c; })[0] || null;
}
/* Tickets encore rangés dans un emplacement donné */
function ticketsDansEmp(code, d) {
  d = d || getData();
  var c = String(code || '').trim().toUpperCase();
  return (d.tickets || []).filter(function (t) {
    if (t.statut === 'livre' || t.statut === 'annule') return false;
    return String(t.emplacement || '').trim().toUpperCase() === c;
  });
}
function empEstPlein(e, d) {
  var cap = parseInt(e.capacite, 10);
  if (!cap || cap <= 0) return false;
  return ticketsDansEmp(e.code, d).length >= cap;
}
/* Libère l'emplacement d'un ticket (retrait complet, annulation…) */
function libererEmplacement(t) {
  if (t && t.emplacement) { t.emplacementLibereLe = now(); t.emplacement = ''; }
}
function badgeEmplacement(t, petit) {
  if (!emplacementActif()) return '';
  if (!t || !t.emplacement) return '';
  return '<span class="emp-badge' + (petit ? ' emp-badge-sm' : '') + '">📍 ' + escapeHtml(t.emplacement) + '</span>';
}

/* ── Choix de l'emplacement au moment du passage en « Prêt » ──── */
var _empCtx = null;
function openEmplacementModal(ticketId, apres) {
  var d = getData();
  var t = d.tickets.filter(function (x) { return x.id === ticketId; })[0];
  if (!t) return;
  _empCtx = { id: ticketId, apres: apres || null };
  var liste = getEmplacements();
  setTxt('empModalTicket', '🧾 ' + t.numero + ' · ' + (t.clientNom || 'Passage')
    + ' · ' + (t.lignes || []).length + ' article(s)');

  var sel = ge('empModalSelect');
  if (sel) {
    var html = '<option value="">— Aucun emplacement —</option>';
    if (!liste.length) {
      html += '<option value="" disabled>Aucun casier enregistré : ajoutez-les dans Paramètres</option>';
    }
    liste.forEach(function (e) {
      var occ = ticketsDansEmp(e.code, d).length;
      var cap = parseInt(e.capacite, 10) || 0;
      var plein = cap > 0 && occ >= cap;
      var etiq = e.code + ' · ' + (e.type || 'Casier') + (e.zone ? ' · ' + e.zone : '')
        + (cap > 0 ? ' (' + occ + '/' + cap + ')' : (occ ? ' (' + occ + ')' : ' (libre)'));
      html += '<option value="' + escapeHtml(e.code) + '"'
        + (t.emplacement === e.code ? ' selected' : '')
        + (plein && t.emplacement !== e.code ? ' data-plein="1"' : '')
        + '>' + escapeHtml(etiq) + (plein && t.emplacement !== e.code ? ' — complet' : '') + '</option>';
    });
    sel.innerHTML = html;
    // proposer d'office le premier emplacement libre
    if (!t.emplacement) {
      var libre = liste.filter(function (e) { return !empEstPlein(e, d); })[0];
      if (libre) sel.value = libre.code;
    }
  }
  var lib = ge('empModalLibre'); if (lib) lib.value = t.emplacement || '';
  ge('modalEmplacement').classList.remove('hidden');
}
function validerEmplacementModal() {
  if (!_empCtx) return;
  var sel = ge('empModalSelect');
  var lib = ge('empModalLibre');
  var code = (lib && lib.value.trim()) ? lib.value.trim().toUpperCase() : (sel ? sel.value : '');
  var d = getData();
  var idx = d.tickets.findIndex(function (x) { return x.id === _empCtx.id; });
  if (idx < 0) return;
  d.tickets[idx].emplacement = code;
  d.tickets[idx].emplacementLe = code ? now() : null;
  saveData(d);
  ge('modalEmplacement').classList.add('hidden');
  toast(code ? ('📍 Rangé en ' + code) : 'Aucun emplacement enregistré', 'ok');
  var apres = _empCtx.apres; var tid = _empCtx.id;
  _empCtx = null;
  if (apres === 'relance') {
    var st = getData().settings || {};
    if (st.relanceAuto !== false) openRelance(tid);
  }
  try { renderEnCours(); } catch (e) {}
  try { if (_activePage === 'rangement') renderRangement(); } catch (e) {}
  updateNotifs();
}
function changerEmplacement(ticketId) {
  var m = ge('modalTicketDetail'); if (m) m.classList.add('hidden');
  openEmplacementModal(ticketId, null);
}

/* ── Étiquette de rangement à coller sur le paquet ─────────────── */
function printEtiquetteRangement(ticketId) {
  var d = getData();
  var t = d.tickets.filter(function (x) { return x.id === ticketId; })[0];
  if (!t) return;
  var s = d.settings || {};
  var win = window.open('', '_blank', 'width=420,height=520');
  if (!win) { toast('Popup bloquée — autorisez les popups', 'warn'); return; }
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Étiquette ' + escapeHtml(t.numero) + '</title><style>'
    + '@page{size:80mm 60mm;margin:4mm}*{box-sizing:border-box}'
    + 'body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:6px;color:#000}'
    + '.b{border:2px solid #000;border-radius:6px;padding:8px;text-align:center}'
    + '.sh{font-size:11px;letter-spacing:1px;text-transform:uppercase}'
    + '.emp{font-size:44px;font-weight:bold;line-height:1;margin:6px 0;letter-spacing:2px}'
    + '.num{font-size:15px;font-weight:bold}'
    + '.cli{font-size:13px;margin-top:2px}'
    + '.inf{font-size:11px;color:#333;margin-top:4px}'
    + 'button{margin:10px auto;display:block;padding:8px 16px;font-size:13px}'
    + '@media print{button{display:none}}'
    + '</style></head><body><div class="b">'
    + '<div class="sh">' + escapeHtml(s.name || 'Pressing') + '</div>'
    + '<div class="emp">' + escapeHtml(t.emplacement || '—') + '</div>'
    + '<div class="num">🧾 ' + escapeHtml(t.numero) + '</div>'
    + '<div class="cli">' + escapeHtml(t.clientNom || 'Client de passage') + '</div>'
    + '<div class="inf">' + (t.lignes || []).length + ' article(s) · prêt le ' + fmtDate(now()) + '</div>'
    + '</div><button onclick="window.print()">🖨️ Imprimer</button></body></html>';
  win.document.write(h); win.document.close();
}

/* ── Écran Rangement : que contient chaque casier ? ────────────── */
function renderRangement() {
  var d = getData();
  var q = (ge('rangSearch') ? ge('rangSearch').value : '').toLowerCase().trim();
  var liste = getEmplacements();
  var prets = (d.tickets || []).filter(function (t) {
    return t.statut !== 'livre' && t.statut !== 'annule';
  });
  var ranges = prets.filter(function (t) { return t.emplacement; });
  var sansEmp = prets.filter(function (t) { return !t.emplacement && t.statut === 'pret'; });

  setTxt('rangCntCasiers', liste.length);
  setTxt('rangCntRanges', ranges.length);
  setTxt('rangCntSans', sansEmp.length);
  var libres = liste.filter(function (e) { return !ticketsDansEmp(e.code, d).length; }).length;
  setTxt('rangCntLibres', libres);

  var box = ge('rangGrid'); if (!box) return;

  if (!liste.length) {
    box.innerHTML = '<div class="card" style="text-align:center;padding:30px">'
      + '<h3 style="margin-bottom:8px">Aucun casier enregistré</h3>'
      + '<p class="text-muted" style="margin-bottom:14px">Déclarez vos casiers, étagères et portants une seule fois : '
      + 'le logiciel vous proposera ensuite un emplacement à chaque fois qu\'une commande passe en « Prêt ».</p>'
      + '<button class="btn btn-primary" onclick="navigateTo(\'parametres\')">⚙️ Déclarer mes casiers</button></div>';
    return;
  }

  var html = '';
  liste.forEach(function (e) {
    var dedans = ticketsDansEmp(e.code, d);
    if (q) {
      var match = String(e.code).toLowerCase().indexOf(q) >= 0
        || String(e.zone || '').toLowerCase().indexOf(q) >= 0
        || dedans.some(function (t) {
          return (t.numero || '').toLowerCase().indexOf(q) >= 0
            || (t.clientNom || '').toLowerCase().indexOf(q) >= 0;
        });
      if (!match) return;
    }
    var cap = parseInt(e.capacite, 10) || 0;
    var plein = cap > 0 && dedans.length >= cap;
    var cls = dedans.length === 0 ? 'emp-libre' : (plein ? 'emp-plein' : 'emp-occupe');
    html += '<div class="emp-card ' + cls + '">'
      + '<div class="emp-card-head"><span class="emp-code">' + escapeHtml(e.code) + '</span>'
      + '<span class="emp-meta">' + escapeHtml(e.type || 'Casier') + (e.zone ? ' · ' + escapeHtml(e.zone) : '') + '</span>'
      + '<span class="emp-occ">' + dedans.length + (cap > 0 ? '/' + cap : '') + '</span></div>';
    if (!dedans.length) {
      html += '<div class="emp-vide">Libre</div>';
    } else {
      html += '<div class="emp-list">' + dedans.map(function (t) {
        var st = getTicketStatutAffiche(t);
        var jrs = t.dateChangementStatut ? daysBetween(t.dateChangementStatut, now()) : 0;
        return '<div class="emp-item" onclick="openTicketDetail(\'' + t.id + '\')">'
          + '<span class="emp-item-num">🧾 ' + escapeHtml(t.numero) + '</span>'
          + '<span class="emp-item-cli">' + escapeHtml(t.clientNom || 'Passage') + '</span>'
          + '<span class="badge ' + st.cls + '">' + st.label + '</span>'
          + (t.statut === 'pret' && jrs >= 15 ? '<span class="emp-item-vieux">' + jrs + ' j</span>' : '')
          + '</div>';
      }).join('') + '</div>';
    }
    if (e.note) html += '<div class="emp-note">' + escapeHtml(e.note) + '</div>';
    html += '</div>';
  });

  if (sansEmp.length) {
    html += '<div class="emp-card emp-orphelin"><div class="emp-card-head">'
      + '<span class="emp-code">⚠️ Sans emplacement</span>'
      + '<span class="emp-meta">prêt mais non rangé</span>'
      + '<span class="emp-occ">' + sansEmp.length + '</span></div><div class="emp-list">'
      + sansEmp.map(function (t) {
        return '<div class="emp-item" onclick="openEmplacementModal(\'' + t.id + '\')">'
          + '<span class="emp-item-num">🧾 ' + escapeHtml(t.numero) + '</span>'
          + '<span class="emp-item-cli">' + escapeHtml(t.clientNom || 'Passage') + '</span>'
          + '<span class="badge badge-pret">à ranger</span></div>';
      }).join('') + '</div></div>';
  }

  box.innerHTML = html || '<div class="card" style="text-align:center;padding:24px;color:var(--t3)">Aucun résultat</div>';
  var s = ge('rangSearch'); if (s) s.oninput = renderRangement;
}

/* ── Déclaration des casiers dans Paramètres ───────────────────── */
var _editingEmpId = null;
function renderEmplacementsSettings() {
  var d = getData();
  var box = ge('empSettingsBody'); if (!box) return;
  var liste = getEmplacements();
  var tgl = ge('setEmpActif');
  if (tgl) {
    tgl.checked = emplacementActif();
    tgl.onchange = function () {
      var d2 = getData();
      d2.settings.emplacementActif = tgl.checked;
      saveData(d2);
      toast(tgl.checked ? '🗄️ Gestion des emplacements activée' : 'Gestion des emplacements désactivée', 'ok');
      updateNotifs();
    };
  }
  if (!liste.length) {
    box.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--t3);padding:18px">'
      + 'Aucun casier. Ajoutez-les un par un, ou générez une série (A1 à A10) en une fois.</td></tr>';
    return;
  }
  box.innerHTML = liste.map(function (e) {
    var occ = ticketsDansEmp(e.code, d).length;
    var cap = parseInt(e.capacite, 10) || 0;
    return '<tr>'
      + '<td><strong>' + escapeHtml(e.code) + '</strong></td>'
      + '<td>' + escapeHtml(e.type || 'Casier') + '</td>'
      + '<td>' + escapeHtml(e.zone || '—') + '</td>'
      + '<td class="num">' + (cap > 0 ? cap : '—') + '</td>'
      + '<td class="num">' + occ + '</td>'
      + '<td class="col-actions">'
      + '<button class="btn btn-sm" onclick="openEmplacementForm(\'' + e.id + '\')">✏️</button> '
      + '<button class="btn btn-sm btn-danger" onclick="deleteEmplacement(\'' + e.id + '\')">🗑</button>'
      + '</td></tr>';
  }).join('');
}
function openEmplacementForm(id) {
  _editingEmpId = id || null;
  var e = id ? getEmplacements().filter(function (x) { return x.id === id; })[0] : null;
  setTxt('modalEmpFormTitle', e ? '✏️ Modifier l\'emplacement' : '🗄️ Nouvel emplacement');
  ge('empCode').value = e ? e.code : '';
  ge('empType').value = e ? (e.type || 'Casier') : 'Casier';
  ge('empZone').value = e ? (e.zone || '') : '';
  ge('empCapacite').value = e ? (e.capacite || '') : '';
  ge('empNote').value = e ? (e.note || '') : '';
  ge('modalEmpForm').classList.remove('hidden');
}
function saveEmplacement() {
  var code = ge('empCode').value.trim().toUpperCase();
  if (!code) { toast('Le code est obligatoire (ex. A1)', 'err'); return; }
  var d = getData();
  if (!d.emplacements) d.emplacements = [];
  var doublon = d.emplacements.filter(function (x) {
    return String(x.code).toUpperCase() === code && x.id !== _editingEmpId;
  })[0];
  if (doublon) { toast('Le code ' + code + ' existe déjà', 'err'); return; }
  var obj = {
    id: _editingEmpId || uid(),
    code: code,
    type: ge('empType').value || 'Casier',
    zone: ge('empZone').value.trim(),
    capacite: parseInt(ge('empCapacite').value, 10) || 0,
    note: ge('empNote').value.trim()
  };
  if (_editingEmpId) {
    var idx = d.emplacements.findIndex(function (x) { return x.id === _editingEmpId; });
    var ancien = idx >= 0 ? d.emplacements[idx].code : null;
    if (idx >= 0) d.emplacements[idx] = obj;
    // le casier a été renommé : on suit les tickets qui s'y trouvaient
    if (ancien && ancien !== code) {
      d.tickets.forEach(function (t) {
        if (String(t.emplacement || '').toUpperCase() === String(ancien).toUpperCase()) t.emplacement = code;
      });
    }
  } else {
    d.emplacements.push(obj);
  }
  saveData(d);
  ge('modalEmpForm').classList.add('hidden');
  toast('🗄️ Emplacement enregistré', 'ok');
  renderEmplacementsSettings();
}
function deleteEmplacement(id) {
  var d = getData();
  var e = (d.emplacements || []).filter(function (x) { return x.id === id; })[0];
  if (!e) return;
  var dedans = ticketsDansEmp(e.code, d).length;
  showConfirm('Supprimer l\'emplacement ' + e.code + ' ?',
    dedans ? (dedans + ' commande(s) y sont rangées. Elles resteront visibles mais sans emplacement.')
           : 'Cet emplacement est vide.',
    function () {
      var d2 = getData();
      d2.emplacements = (d2.emplacements || []).filter(function (x) { return x.id !== id; });
      d2.tickets.forEach(function (t) {
        if (String(t.emplacement || '').toUpperCase() === String(e.code).toUpperCase()) t.emplacement = '';
      });
      saveData(d2);
      toast('Emplacement supprimé', 'ok');
      renderEmplacementsSettings();
    });
}
/* Générer A1…A10 d'un coup : évite de saisir vingt casiers à la main */
function genererSerieEmplacements() {
  var prefixe = (ge('empSeriePrefixe').value || '').trim().toUpperCase();
  var nb = parseInt(ge('empSerieNb').value, 10) || 0;
  var type = ge('empSerieType').value || 'Casier';
  var cap = parseInt(ge('empSerieCap').value, 10) || 0;
  if (!prefixe) { toast('Indiquez une lettre ou un préfixe (ex. A)', 'err'); return; }
  if (nb < 1 || nb > 60) { toast('Indiquez un nombre entre 1 et 60', 'err'); return; }
  var d = getData();
  if (!d.emplacements) d.emplacements = [];
  var ajoutes = 0;
  for (var i = 1; i <= nb; i++) {
    var code = prefixe + i;
    if (d.emplacements.some(function (x) { return String(x.code).toUpperCase() === code; })) continue;
    d.emplacements.push({ id: uid(), code: code, type: type, zone: '', capacite: cap, note: '' });
    ajoutes++;
  }
  saveData(d);
  toast(ajoutes ? ('🗄️ ' + ajoutes + ' emplacement(s) créé(s)') : 'Ces emplacements existent déjà', ajoutes ? 'ok' : 'warn');
  renderEmplacementsSettings();
}

/* ══ EN COURS (KANBAN) ═════════════════════════════════════════ */
function renderEnCours() {
  var d = getData();
  var q = (ge('encoursSearch') ? ge('encoursSearch').value : '').toLowerCase().trim();
  var tickets = d.tickets.filter(function (t) {
    if (t.statut === 'livre' || t.statut === 'annule') return false;
    if (q && !(t.numero || '').toLowerCase().includes(q)
          && !(t.clientNom || '').toLowerCase().includes(q)
          && !(t.emplacement || '').toLowerCase().includes(q)) return false;
    return true;
  });
  var byStatut = { recu: [], traitement: [], pret: [], oublie: [] };
  tickets.forEach(function (t) {
    var st = getTicketStatutAffiche(t);
    var key = st.code === 'oublie' ? 'oublie' : t.statut;
    if (byStatut[key]) byStatut[key].push(t);
  });
  setTxt('cntRecu', byStatut.recu.length);
  setTxt('cntTraitement', byStatut.traitement.length);
  setTxt('cntPret', byStatut.pret.length);
  setTxt('cntOublie', byStatut.oublie.length);
  ge('colRecu').innerHTML = renderKanbanCards(byStatut.recu, 'recu');
  ge('colTraitement').innerHTML = renderKanbanCards(byStatut.traitement, 'traitement');
  ge('colPret').innerHTML = renderKanbanCards(byStatut.pret, 'pret');
  ge('colOublie').innerHTML = renderKanbanCards(byStatut.oublie, 'oublie');
  // Bindings
  var s = ge('encoursSearch'); if (s) s.oninput = renderEnCours;
  ge('btnEncoursPrint').onclick = printEnCoursList;
}

function renderKanbanCards(tickets, statut) {
  if (!tickets.length) return '<div style="text-align:center;color:var(--t3);font-size:.78rem;padding:18px">Aucun ticket</div>';
  return tickets.sort(function (a, b) { return new Date(a.date) - new Date(b.date); }).map(function (t) {
    var nbArticles = (t.lignes || []).length;
    var resume = (t.lignes || []).slice(0, 2).map(function (l) { return l.emoji + ' ' + l.articleNom; }).join(', ');
    if (nbArticles > 2) resume += ' +' + (nbArticles - 2);
    var delay = getDelayStatus(t);
    var paye = t.paye || 0;
    var ttc = t.ttc || 0;
    var resteHtml = paye >= ttc - 0.01 ? '✅ Soldé' : '<span style="color:var(--err)">' + fmt(ttc - paye) + '</span>';

    var actions = '';
    if (statut === 'recu') {
      actions = '<button class="btn btn-warn btn-sm" onclick="event.stopPropagation();changeTicketStatut(\'' + t.id + '\',\'traitement\')">⚙️ Traitement</button>';
    } else if (statut === 'traitement') {
      actions = '<button class="btn btn-success btn-sm" onclick="event.stopPropagation();changeTicketStatut(\'' + t.id + '\',\'pret\')">✅ Prêt</button>';
    } else if (statut === 'pret') {
      if (emplacementActif()) {
        actions = '<button class="btn btn-sm ' + (t.emplacement ? '' : 'btn-warn') + '" onclick="event.stopPropagation();openEmplacementModal(\'' + t.id + '\')">📍 ' + (t.emplacement ? 'Déplacer' : 'Ranger') + '</button>';
      }
      actions += '<button class="btn btn-info btn-sm" onclick="event.stopPropagation();notifyClientPret(\'' + t.id + '\')">📱 Notifier</button>'
              + '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();gotoRetrait(\'' + t.numero + '\')">🚪 Retrait</button>';
    } else if (statut === 'oublie') {
      actions = '<button class="btn btn-warn btn-sm" onclick="event.stopPropagation();notifyClientPret(\'' + t.id + '\')">📱 Relancer</button>';
    }

    return '<div class="ticket-card" onclick="openTicketDetail(\'' + t.id + '\')">'
      + '<div class="ticket-num">🧾 ' + t.numero + (t.express ? ' <span class="tk-express">⚡ EXPRESS</span>' : '') + '</div>'
      + '<div class="ticket-client">' + escapeHtml(t.clientNom || 'Passage') + badgeEmplacement(t, true) + '</div>'
      + '<div class="ticket-articles">' + escapeHtml(resume) + ' · ' + nbArticles + ' art.</div>'
      + '<div class="ticket-foot">'
      + '<span class="price">' + fmt(t.ttc) + '</span>'
      + (delay ? '<span class="delay ' + delay.cls + '">' + delay.label + '</span>' : '')
      + '</div>'
      + '<div style="font-size:.72rem;color:var(--t3);margin-top:3px">Reste : ' + resteHtml + '</div>'
      + (actions ? '<div class="ticket-actions-row">' + actions + '</div>' : '')
      + '</div>';
  }).join('');
}

function changeTicketStatut(id, newStatut) {
  var d = getData();
  var idx = d.tickets.findIndex(function (t) { return t.id === id; });
  if (idx < 0) return;
  d.tickets[idx].statut = newStatut;
  d.tickets[idx].dateChangementStatut = now();
  saveData(d);
  var labels = { recu: 'Reçu', traitement: 'En traitement', pret: '✅ Prêt' };
  toast('Statut → ' + labels[newStatut], 'ok');
  renderEnCours();
  updateNotifs();
  if (newStatut !== 'pret') return;
  // Le linge vient d'être terminé : on demande tout de suite où il est rangé,
  // puis seulement ensuite on propose de prévenir le client.
  if (emplacementActif() && getEmplacements().length) { openEmplacementModal(id, 'relance'); return; }
  var _st = (getData().settings || {}); if (_st.relanceAuto !== false) openRelance(id);
}

/* ══ NUMÉROS DE TÉLÉPHONE ═══════════════════════════════════════
   Objectif : quelle que soit la façon dont l'employé saisit le
   numéro, le bouton WhatsApp doit ouvrir la bonne conversation.

   Sont acceptés, pour un pressing réglé sur la Côte d'Ivoire :
       0707070707            → 225 07 07 07 07 07
       07 07 07 07 07        → 225 07 07 07 07 07
       707070707             → 225 07 07 07 07 07   (0 oublié)
       +225 07 07 07 07 07   → inchangé
       00225 0707070707      → inchangé
       2250707070707         → inchangé
   Et pour un pressing réglé sur la France :
       06 12 34 56 78        → 33 6 12 34 56 78
       0612345678            → 33 6 12 34 56 78
       612345678             → 33 6 12 34 56 78

   Un numéro saisi avec un + et un autre indicatif (client de la
   diaspora, fournisseur à l'étranger) n'est JAMAIS réécrit.

   Deux informations par pays :
   - « nsn »   = longueur du numéro national, tel qu'il s'écrit
                 dans le pays, une fois le 0 de préfixe retiré s'il
                 y en a un. Côte d'Ivoire : 10 (le 0 fait partie du
                 numéro). France : 9 (le 0 est un préfixe).
   - « trunk » = vrai si le numéro local s'écrit avec un 0 devant
                 qu'il faut RETIRER pour l'international.
   ══════════════════════════════════════════════════════════════ */
var PAYS_TEL = [
  { ind: '225', nom: "Côte d'Ivoire", trunk: false, nsn: 10 },
  { ind: '221', nom: 'Sénégal', trunk: false, nsn: 9 },
  { ind: '223', nom: 'Mali', trunk: false, nsn: 8 },
  { ind: '224', nom: 'Guinée', trunk: false, nsn: 9 },
  { ind: '226', nom: 'Burkina Faso', trunk: false, nsn: 8 },
  { ind: '227', nom: 'Niger', trunk: false, nsn: 8 },
  { ind: '228', nom: 'Togo', trunk: false, nsn: 8 },
  { ind: '229', nom: 'Bénin', trunk: false, nsn: 10 },
  { ind: '237', nom: 'Cameroun', trunk: false, nsn: 9 },
  { ind: '241', nom: 'Gabon', trunk: false, nsn: 8 },
  { ind: '242', nom: 'Congo', trunk: false, nsn: 9 },
  { ind: '243', nom: 'RD Congo', trunk: true, nsn: 9 },
  { ind: '269', nom: 'Comores', trunk: false, nsn: 7 },
  { ind: '261', nom: 'Madagascar', trunk: true, nsn: 9 },
  { ind: '230', nom: 'Maurice', trunk: false, nsn: 8 },
  { ind: '212', nom: 'Maroc', trunk: true, nsn: 9 },
  { ind: '213', nom: 'Algérie', trunk: true, nsn: 9 },
  { ind: '216', nom: 'Tunisie', trunk: false, nsn: 8 },
  { ind: '33', nom: 'France', trunk: true, nsn: 9 },
  { ind: '32', nom: 'Belgique', trunk: true, nsn: 0 },
  { ind: '41', nom: 'Suisse', trunk: true, nsn: 9 },
  { ind: '262', nom: 'La Réunion / Mayotte', trunk: true, nsn: 9 },
  { ind: '1', nom: 'Canada / États-Unis', trunk: false, nsn: 10 }
];

/* Indicatif du pressing, réglé dans Paramètres. 225 par défaut. */
function indicatifPays() {
  var d = getData();
  var i = (d.settings && d.settings.indicatif) || '225';
  return String(i).replace(/[^0-9]/g, '') || '225';
}
function paysDeIndicatif(ind) {
  for (var i = 0; i < PAYS_TEL.length; i++) if (PAYS_TEL[i].ind === ind) return PAYS_TEL[i];
  return { ind: ind, nom: '', trunk: false, nsn: 0 };
}
function paysCourant() { return paysDeIndicatif(indicatifPays()); }

/* Le numéro national a-t-il la bonne longueur pour ce pays ? */
function nsnValide(n, pays) {
  if (!pays.nsn) return n.length >= 6 && n.length <= 12;   // pays non renseigné
  if (pays.trunk) return n.length === pays.nsn || (n.charAt(0) === '0' && n.length === pays.nsn + 1);
  return n.length === pays.nsn;
}

/* Remet la partie nationale dans la forme attendue par WhatsApp. */
function nsnNormalise(n, pays) {
  if (!n) return '';
  if (!pays.nsn) return n.replace(/^0+/, '') || n;

  if (pays.trunk) {
    // France, Maroc, Algérie… : le 0 de tête est un préfixe, on l'enlève
    var sansZero = n.replace(/^0+/, '');
    if (sansZero.length === pays.nsn) return sansZero;
    return sansZero || n;
  }

  // Côte d'Ivoire, Sénégal, Bénin… : le 0 éventuel FAIT PARTIE du numéro
  if (n.length === pays.nsn) return n;
  // un 0 de trop devant (l'employé a ajouté un préfixe qui n'existe pas ici)
  if (n.charAt(0) === '0' && n.length === pays.nsn + 1) return n.slice(1);
  // le 0 initial a été oublié à la saisie
  if (n.length === pays.nsn - 1 && n.charAt(0) !== '0') return '0' + n;
  // plusieurs zéros collés devant
  var net = n.replace(/^0+/, '');
  if (net.length === pays.nsn) return net;
  if (net.length === pays.nsn - 1) return '0' + net;
  return n;
}

/* Met un numéro au format international attendu par WhatsApp :
   que des chiffres, indicatif compris, sans + ni espaces.
   Renvoie '' si le numéro est inutilisable. */
function waNumber(tel) {
  var brut = String(tel || '').trim();
  if (!brut) return '';
  var n = brut.replace(/[^0-9]/g, '');
  if (!n) return '';
  var ind = indicatifPays();
  var pays = paysDeIndicatif(ind);

  // 1. Numéro écrit explicitement en international : + ou 00
  var explicite = false;
  if (brut.charAt(0) === '+') explicite = true;
  else if (n.indexOf('00') === 0 && n.length > 8) { n = n.slice(2); explicite = true; }

  if (explicite) {
    if (n.indexOf(ind) === 0) return ind + nsnNormalise(n.slice(ind.length), pays);
    return n;   // autre pays : on n'y touche surtout pas
  }

  // 2. Indicatif collé devant sans le + (ex. 2250707070707).
  //    On ne le retire que si le reste ressemble à un numéro du pays
  //    ET que le numéro complet, lui, n'y ressemble pas : sans cette
  //    précaution, un numéro local commençant par les mêmes chiffres
  //    que l'indicatif serait amputé.
  if (n.indexOf(ind) === 0) {
    var reste = n.slice(ind.length);
    if (nsnValide(reste, pays) && !nsnValide(n, pays)) {
      return ind + nsnNormalise(reste, pays);
    }
  }

  // 3. Numéro local ordinaire
  return ind + nsnNormalise(n, pays);
}

/* Vrai si le numéro n'a pas la longueur attendue pour le pays réglé.
   Sert à prévenir l'employé AVANT l'envoi, jamais à bloquer la saisie. */
function telSuspect(tel) {
  var n = waNumber(tel);
  if (!n) return false;
  var ind = indicatifPays();
  var pays = paysDeIndicatif(ind);
  if (!pays.nsn) return false;
  if (n.indexOf(ind) !== 0) return false;   // numéro étranger : on ne juge pas
  var loc = n.slice(ind.length);
  var attendu = pays.trunk ? pays.nsn : pays.nsn;
  return loc.length !== attendu;
}

/* Même numéro, présenté avec le + pour les liens SMS et l'affichage. */
function telInternational(tel) {
  var n = waNumber(tel);
  return n ? '+' + n : '';
}

/* Affichage lisible : +225 07 07 07 07 07 */
function telJoli(tel) {
  var n = waNumber(tel);
  if (!n) return '';
  var ind = indicatifPays();
  if (n.indexOf(ind) !== 0) return '+' + n;
  var loc = n.slice(ind.length);
  var tete = '';
  if (loc.length % 2 === 1) { tete = loc.charAt(0) + ' '; loc = loc.slice(1); }
  var paq = loc.match(/.{1,2}/g) || [loc];
  return '+' + ind + ' ' + tete + paq.join(' ');
}

var _relanceCtx = null;
function openRelance(ticketId) {
  var d = getData();
  var t = d.tickets.find(function (x) { return x.id === ticketId; }); if (!t) return;
  var cli = t.clientId ? d.clients.find(function (c) { return c.id === t.clientId; }) : null;
  var tel = cli ? (cli.tel || '') : '';
  var email = cli ? (cli.email || '') : '';
  if (!tel && !email) return; // aucun contact : on ne propose pas
  var nomAff = cli ? ((cli.prenom || '') + ' ' + (cli.nom || '')).trim() : (t.clientNom || '');
  var boutique = (d.settings && d.settings.name) || 'votre pressing';
  var msg = 'Bonjour ' + (nomAff ? nomAff : '') + ', votre commande ' + t.numero + ' est prête chez ' + boutique + '. Vous pouvez venir la récupérer. Merci !';
  _relanceCtx = { tel: tel, email: email, numero: t.numero };
  var telAff = tel ? telInternational(tel) : '';
  setTxt('relanceWho', (nomAff ? ('Client : ' + nomAff) : 'Client de passage')
    + (telAff ? (' · ' + telAff + (telSuspect(tel) ? ' ⚠️ numéro incomplet' : '')) : '')
    + (email ? (' · ' + email) : ''));
  if (ge('relanceMsg')) ge('relanceMsg').value = msg;
  if (ge('relanceWa')) ge('relanceWa').style.display = tel ? '' : 'none';
  if (ge('relanceSms')) ge('relanceSms').style.display = tel ? '' : 'none';
  if (ge('relanceMail')) ge('relanceMail').style.display = email ? '' : 'none';
  if (ge('relanceAutoChk')) ge('relanceAutoChk').checked = (d.settings.relanceAuto !== false);
  if (ge('modalRelance')) ge('modalRelance').classList.remove('hidden');
}

function gotoRetrait(numero) {
  navigateTo('retrait');
  setTimeout(function () {
    var inp = ge('retraitSearch');
    if (inp) { inp.value = numero; inp.dispatchEvent(new Event('input')); }
  }, 100);
}

function printEnCoursList() {
  var d = getData();
  var enCours = d.tickets.filter(function (t) { return t.statut !== 'livre' && t.statut !== 'annule'; })
    .sort(function (a, b) {
      // Trier par date de retrait
      if (!a.delaiRetrait) return 1;
      if (!b.delaiRetrait) return -1;
      return new Date(a.delaiRetrait) - new Date(b.delaiRetrait);
    });
  var win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { toast('Popup bloquée', 'warn'); return; }
  win.document.write('<html><head><title>Tickets en cours</title><style>body{font-family:Arial;padding:18px;font-size:12px}h1{font-size:18px;margin-bottom:6px}h2{font-size:13px;color:#666;margin-bottom:14px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#0ea5e9;color:#fff;font-size:11px}.late{color:#ef4444;font-weight:bold}.today{color:#f59e0b;font-weight:bold}@media print{button{display:none}}</style></head><body>');
  win.document.write('<h1>📦 Tickets en cours — ' + escapeHtml(d.settings.name) + '</h1>');
  win.document.write('<h2>Imprimé le ' + new Date().toLocaleString('fr-FR') + ' · ' + enCours.length + ' tickets</h2>');
  win.document.write('<table><thead><tr><th>N°</th><th>Client</th><th>Tél.</th><th>Articles</th><th>Statut</th><th>📍 Empl.</th><th>Délai retrait</th><th>Reste</th></tr></thead><tbody>');
  enCours.forEach(function (t) {
    var c = t.clientId ? d.clients.filter(function (x) { return x.id === t.clientId; })[0] : null;
    var tel = c ? c.tel : '';
    var st = getTicketStatutAffiche(t);
    var delay = getDelayStatus(t);
    var delayCls = delay && delay.cls === 'delay-late' ? 'late' : (delay && delay.cls === 'delay-today' ? 'today' : '');
    var reste = (t.ttc || 0) - (t.paye || 0);
    var resume = (t.lignes || []).map(function (l) { return l.articleNom; }).join(', ');
    win.document.write('<tr><td><strong>' + t.numero + '</strong></td><td>' + escapeHtml(t.clientNom) + '</td><td>' + escapeHtml(tel || '') + '</td><td>' + escapeHtml(resume) + '</td><td>' + st.label + '</td><td><strong>' + escapeHtml(t.emplacement || '—') + '</strong></td><td class="' + delayCls + '">' + (t.delaiRetrait ? fmtDate(t.delaiRetrait) : '—') + (delay ? ' (' + delay.label + ')' : '') + '</td><td>' + fmt(reste) + '</td></tr>');
  });
  win.document.write('</tbody></table>');
  win.document.write('<button onclick="window.print()" style="margin-top:18px;padding:10px 20px;background:#0ea5e9;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Imprimer</button>');
  win.document.write('</body></html>');
  win.document.close();
}

/* ══ NOTIFICATION WHATSAPP / EMAIL ═════════════════════════════ */
function notifyClientPret(ticketId) {
  var d = getData();
  var t = d.tickets.filter(function (x) { return x.id === ticketId; })[0];
  if (!t) return;
  var c = t.clientId ? d.clients.filter(function (x) { return x.id === t.clientId; })[0] : null;
  if (!c || (!c.tel && !c.email)) {
    toast('⚠️ Aucun contact pour ce client', 'warn');
    return;
  }
  // Pop-up choix
  var html = '<div style="text-align:center"><h3>📱 Notifier ' + escapeHtml(t.clientNom) + '</h3>';
  html += '<p style="color:var(--t2);margin:10px 0">Ticket <strong>' + t.numero + '</strong> est prêt</p>';
  html += '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">';
  if (c.tel) {
    var tel = waNumber(c.tel);
    var msg = encodeURIComponent('Bonjour ' + (c.prenom || '') + ', votre commande ' + t.numero + ' au pressing ' + d.settings.name + ' est prête à être récupérée. Merci !');
    html += '<a href="https://wa.me/' + tel + '?text=' + msg + '" target="_blank" class="btn btn-success" style="text-decoration:none">📱 WhatsApp</a>';
    html += '<a href="sms:' + telInternational(c.tel) + '?body=' + msg + '" class="btn btn-info" style="text-decoration:none">💬 SMS</a>';
  }
  if (c.email) {
    var subj = encodeURIComponent('Votre commande ' + t.numero + ' est prête');
    var body = encodeURIComponent('Bonjour ' + (c.prenom || '') + ',\n\nVotre commande ' + t.numero + ' déposée le ' + fmtDate(t.date) + ' au pressing ' + d.settings.name + ' est prête à être récupérée.\n\nReste à payer : ' + fmt((t.ttc || 0) - (t.paye || 0)) + '\n\nÀ bientôt !');
    html += '<a href="mailto:' + c.email + '?subject=' + subj + '&body=' + body + '" class="btn" style="text-decoration:none">✉️ Email</a>';
  }
  html += '<button class="btn" onclick="document.getElementById(\'modalTicketDetail\').classList.add(\'hidden\')" style="margin-top:8px">Fermer</button>';
  html += '</div></div>';
  ge('ticketDetailContent').innerHTML = html;
  ge('modalTicketDetail').classList.remove('hidden');
}

function notifyAllPrets() {
  var d = getData();
  var prets = d.tickets.filter(function (t) {
    if (t.statut !== 'pret') return false;
    var jrs = t.dateChangementStatut ? daysBetween(t.dateChangementStatut, now()) : 0;
    return jrs < 30;
  });
  var avecContact = prets.filter(function (t) {
    if (!t.clientId) return false;
    var c = d.clients.filter(function (x) { return x.id === t.clientId; })[0];
    return c && (c.tel || c.email);
  });
  if (!avecContact.length) { toast('Aucun client à notifier', 'info'); return; }
  // Générer une fenêtre avec liste cliquable
  var win = window.open('', '_blank', 'width=600,height=700');
  if (!win) { toast('Popup bloquée', 'warn'); return; }
  win.document.write('<html><head><title>Liste à notifier</title><style>body{font-family:Arial;padding:18px;font-size:13px;background:#f1f5f9}h1{font-size:18px;margin-bottom:14px}.item{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.left{flex:1}.client{font-weight:bold}.tel{color:#475569;font-size:.85rem}.actions{display:flex;gap:6px;flex-wrap:wrap}a{padding:6px 12px;border-radius:6px;text-decoration:none;font-size:.8rem;font-weight:600}.wa{background:#10b981;color:#fff}.sms{background:#0ea5e9;color:#fff}.em{background:#6366f1;color:#fff}@media print{.actions{display:none}}</style></head><body>');
  win.document.write('<h1>📋 Liste à notifier — ' + avecContact.length + ' client(s)</h1>');
  avecContact.forEach(function (t) {
    var c = d.clients.filter(function (x) { return x.id === t.clientId; })[0];
    var html = '<div class="item">';
    html += '<div class="left"><div class="client">' + escapeHtml(t.clientNom) + '</div><div class="tel">🧾 ' + t.numero + (c.tel ? ' · 📞 ' + escapeHtml(c.tel) : '') + (c.email ? ' · ✉️ ' + escapeHtml(c.email) : '') + '</div></div>';
    html += '<div class="actions">';
    if (c.tel) {
      var tel = waNumber(c.tel);
      var msg = encodeURIComponent('Bonjour ' + (c.prenom || '') + ', votre commande ' + t.numero + ' est prête au pressing ' + d.settings.name + '. Merci !');
      html += '<a class="wa" href="https://wa.me/' + tel + '?text=' + msg + '" target="_blank">📱 WhatsApp</a>';
      html += '<a class="sms" href="sms:' + telInternational(c.tel) + '?body=' + msg + '">💬 SMS</a>';
    }
    if (c.email) {
      var subj = encodeURIComponent('Votre commande ' + t.numero + ' est prête');
      var body = encodeURIComponent('Bonjour, votre commande ' + t.numero + ' est prête. À bientôt !');
      html += '<a class="em" href="mailto:' + c.email + '?subject=' + subj + '&body=' + body + '">✉️ Email</a>';
    }
    html += '</div></div>';
    win.document.write(html);
  });
  win.document.write('</body></html>');
  win.document.close();
}

/* ══ DÉTAIL TICKET (modal) ═════════════════════════════════════ */
function openTicketDetail(id) {
  var d = getData();
  var t = d.tickets.filter(function (x) { return x.id === id; })[0];
  if (!t) t = (d.corbeille || []).filter(function (x) { return x.id === id; })[0];
  if (!t) return;
  var st = getTicketStatutAffiche(t);
  var delay = getDelayStatus(t);
  var pay = getPaiementStatus(t);
  var c = t.clientId ? d.clients.filter(function (x) { return x.id === t.clientId; })[0] : null;
  var reste = (t.ttc || 0) - (t.paye || 0);

  var actionsHtml = '';
  if (t.statut === 'recu') actionsHtml = '<button class="btn btn-warn" onclick="changeTicketStatut(\'' + t.id + '\',\'traitement\');document.getElementById(\'modalTicketDetail\').classList.add(\'hidden\')">⚙️ Passer en traitement</button>';
  else if (t.statut === 'traitement') actionsHtml = '<button class="btn btn-success" onclick="changeTicketStatut(\'' + t.id + '\',\'pret\');document.getElementById(\'modalTicketDetail\').classList.add(\'hidden\')">✅ Marquer prêt</button>';
  else if (t.statut === 'pret') {
    actionsHtml = '<button class="btn btn-primary" onclick="document.getElementById(\'modalTicketDetail\').classList.add(\'hidden\');gotoRetrait(\'' + t.numero + '\')">🚪 Aller au retrait</button>';
    if (c && (c.tel || c.email)) actionsHtml += ' <button class="btn btn-info" onclick="notifyClientPret(\'' + t.id + '\')">📱 Notifier client</button>';
  }
  /* Corrections : retrait validé par erreur, client jamais venu */
  var enCorbeille = !d.tickets.some(function (x) { return x.id === t.id; });
  if (!enCorbeille && (t.retraitsHist || []).length) {
    var _op = t.retraitsHist[t.retraitsHist.length - 1];
    actionsHtml += ' <button class="btn btn-warn" onclick="annulerDernierRetrait(\'' + t.id + '\')" '
      + 'title="Le client n\'est pas venu : rétablir l\'état d\'avant le retrait">↩️ Annuler le retrait'
      + (_op.montantEncaisse > 0 ? ' (' + fmt(_op.montantEncaisse) + ')' : '') + '</button>';
  }
  if (!enCorbeille && t.statut === 'livre' && !(t.retraitsHist || []).length) {
    actionsHtml += ' <button class="btn btn-warn" onclick="remettreEnPret(\'' + t.id + '\')">↩️ Remettre en « Prêt »</button>';
  }

  var html = '<h3 style="display:flex;justify-content:space-between;align-items:center"><span>🧾 ' + t.numero + (t.express ? ' <span class="tk-express">⚡ EXPRESS</span>' : '') + '</span><span class="badge ' + st.cls + '">' + st.label + '</span></h3>';
  html += '<div class="grid-2" style="margin-bottom:12px">';
  html += '<div><strong>Client :</strong> ' + escapeHtml(t.clientNom);
  if (c && c.tel) html += '<br><strong>Tél :</strong> ' + escapeHtml(c.tel);
  if (c && c.email) html += '<br><strong>Email :</strong> ' + escapeHtml(c.email);
  html += '</div>';
  html += '<div><strong>Date dépôt :</strong> ' + fmtDateTime(t.date);
  if (t.delaiRetrait) html += '<br><strong>Délai retrait :</strong> ' + fmtDate(t.delaiRetrait) + (delay ? ' <span class="' + delay.cls + '">(' + delay.label + ')</span>' : '');
  if (emplacementActif() && t.emplacement) html += '<br><strong>📍 Emplacement :</strong> <span class="emp-badge">' + escapeHtml(t.emplacement) + '</span>';
  html += '</div></div>';
  if (t.note) html += '<div style="background:var(--warn-bg);padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:.86rem">📝 ' + escapeHtml(t.note) + '</div>';

  html += '<h4 style="margin-bottom:8px">📦 Articles (' + (t.lignes || []).length + ')</h4>';
  html += '<div style="background:var(--sur2);padding:8px;border-radius:6px;margin-bottom:12px;max-height:200px;overflow-y:auto">';
  (t.lignes || []).forEach(function (l) {
    html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bdr-l)">'
      + '<span style="font-size:18px">' + (l.emoji || '👔') + '</span>'
      + '<span class="dl-id">' + l.tagId.split('-').slice(-1)[0] + '</span>'
      + '<span style="flex:1"><strong>' + escapeHtml(l.articleNom) + '</strong> · <span style="color:var(--t3);font-size:.78rem">' + escapeHtml(l.traitementNom || '') + '</span>'
      + (l.note ? '<br><span style="font-size:.74rem;color:var(--t3);font-style:italic">📝 ' + escapeHtml(l.note) + '</span>' : '')
      + '</span>'
      + '<span style="font-weight:700;color:var(--brand)">' + fmt(l.prix) + '</span>'
      + '</div>';
  });
  html += '</div>';

  html += '<div class="grid-2">';
  html += '<div style="background:var(--sur2);padding:10px;border-radius:6px"><h4 style="font-size:.78rem;margin-bottom:6px">💰 Financier</h4>';
  html += '<div class="tline"><span>Sous-total HT</span><span>' + fmt(t.ht) + '</span></div>';
  if (t.remise > 0) html += '<div class="tline"><span>Remise</span><span style="color:var(--err)">-' + fmt(t.remise) + '</span></div>';
  html += '<div class="tline"><span>TVA</span><span>' + fmt(t.tva) + '</span></div>';
  html += '<div class="tline total"><span>TTC</span><span>' + fmt(t.ttc) + '</span></div>';
  html += '<div class="tline"><span>Payé</span><span style="color:var(--ok)">' + fmt(t.paye || 0) + '</span></div>';
  html += '<div class="tline solde"><span>Reste à payer</span><span>' + fmt(reste) + '</span></div>';
  html += '<div style="margin-top:6px"><span class="badge ' + pay.cls + '">' + pay.label + '</span></div>';
  html += '</div>';

  html += '<div style="background:var(--sur2);padding:10px;border-radius:6px"><h4 style="font-size:.78rem;margin-bottom:6px">📜 Historique paiements</h4>';
  if (t.paiementsHist && t.paiementsHist.length) {
    t.paiementsHist.forEach(function (p, pi) {
      html += '<div style="font-size:.78rem;padding:4px 0;border-bottom:1px solid var(--bdr-l);display:flex;align-items:center;gap:6px">'
        + '<span style="flex:1"><strong>' + fmt(p.montant) + '</strong> · ' + (p.label || p.mode) + ' · ' + fmtDate(p.date) + '</span>'
        + (enCorbeille ? '' : '<button class="btn btn-sm btn-danger" style="padding:1px 6px;font-size:.7rem" '
          + 'onclick="annulerPaiement(\'' + t.id + '\',' + pi + ')" title="Retirer ce paiement (erreur de saisie)">✕</button>')
        + '</div>';
    });
  } else {
    html += '<div style="color:var(--t3);font-size:.8rem">Aucun paiement enregistré</div>';
  }
  html += '</div></div>';

  if ((t.corrections || []).length) {
    html += '<div style="background:rgba(245,158,11,.09);border:1px solid rgba(245,158,11,.3);border-radius:6px;padding:8px 10px;margin-top:10px">'
      + '<h4 style="font-size:.76rem;margin-bottom:4px">✏️ Corrections effectuées</h4>';
    t.corrections.forEach(function (co) {
      html += '<div style="font-size:.74rem;color:var(--t2)">'
        + (co.type === 'annulation-retrait' ? 'Retrait annulé' : 'Paiement annulé')
        + (co.montantAnnule ? ' · ' + fmt(co.montantAnnule) : '')
        + ' · ' + fmtDateTime(co.date) + (co.par ? ' · ' + escapeHtml(co.par) : '') + '</div>';
    });
    html += '</div>';
  }

  html += '<div class="modal-actions" style="flex-wrap:wrap">';
  html += actionsHtml;
  html += '<button class="btn btn-sm" onclick="reprintTicketDepot(\'' + t.id + '\')">🖨️ Re-imprimer</button>';
  if (emplacementActif() && !enCorbeille && t.statut !== 'livre' && t.statut !== 'annule') {
    html += '<button class="btn btn-sm" onclick="changerEmplacement(\'' + t.id + '\')">📍 ' + (t.emplacement ? 'Changer d\'emplacement' : 'Ranger') + '</button>';
    if (t.emplacement) html += '<button class="btn btn-sm" onclick="printEtiquetteRangement(\'' + t.id + '\')">🏷️ Étiquette</button>';
  }
  if (t.statut !== 'annule' && t.statut !== 'livre') html += '<button class="btn btn-sm btn-danger" onclick="cancelTicket(\'' + t.id + '\')">↩️ Annuler ticket</button>';
  html += '<button class="btn" onclick="document.getElementById(\'modalTicketDetail\').classList.add(\'hidden\')">Fermer</button>';
  html += '</div>';

  ge('ticketDetailContent').innerHTML = html;
  ge('modalTicketDetail').classList.remove('hidden');
}

function reprintTicketDepot(id) {
  var d = getData();
  var t = d.tickets.filter(function (x) { return x.id === id; })[0];
  if (!t) t = (d.corbeille || []).filter(function (x) { return x.id === id; })[0];
  if (t) printTicketDepot(t);
}

function cancelTicket(id) {
  showConfirm('Annuler ce ticket ?', 'Le ticket passera en statut "Annulé". Les paiements ne sont pas remboursés automatiquement.', function () {
    var d = getData();
    var idx = d.tickets.findIndex(function (t) { return t.id === id; });
    if (idx < 0) return;
    d.tickets[idx].statut = 'annule';
    libererEmplacement(d.tickets[idx]);
    d.tickets[idx].dateChangementStatut = now();
    saveData(d);
    toast('Ticket annulé', 'ok');
    ge('modalTicketDetail').classList.add('hidden');
    renderEnCours();
    updateNotifs();
  });
}

/* ══ RETRAIT ═══════════════════════════════════════════════════ */
function renderRetrait() {
  ge('retraitResults').innerHTML = '';
  ge('retraitDetail').classList.add('hidden');
  var inp = ge('retraitSearch');
  if (inp) {
    inp.value = '';
    inp.oninput = function () {
      var q = inp.value.toLowerCase().trim();
      if (q.length < 2) { ge('retraitResults').innerHTML = ''; ge('retraitDetail').classList.add('hidden'); return; }
      searchRetrait(q);
    };
    setTimeout(function(){ inp.focus(); }, 100);
  }
}

function searchRetrait(q) {
  var d = getData();
  var matches = d.tickets.filter(function (t) {
    if (t.statut === 'livre' || t.statut === 'annule') return false;
    if ((t.numero || '').toLowerCase().includes(q)) return true;
    if ((t.clientNom || '').toLowerCase().includes(q)) return true;
    if ((t.emplacement || '').toLowerCase().includes(q)) return true;
    return false;
  }).slice(0, 10);
  var res = ge('retraitResults');
  if (!matches.length) {
    res.innerHTML = '<div style="text-align:center;color:var(--t3);padding:20px">Aucun ticket trouvé pour "' + escapeHtml(q) + '"</div>';
    ge('retraitDetail').classList.add('hidden');
    return;
  }
  // Si exact match (un seul résultat sur n° complet) -> ouvrir direct
  if (matches.length === 1 && matches[0].numero.toLowerCase() === q) {
    res.innerHTML = '';
    showRetraitDetail(matches[0].id);
    return;
  }
  res.innerHTML = '<div class="card"><h3>🔍 ' + matches.length + ' résultat(s)</h3>'
    + matches.map(function (t) {
      var st = getTicketStatutAffiche(t);
      var reste = (t.ttc || 0) - (t.paye || 0);
      return '<div class="ticket-card" onclick="showRetraitDetail(\'' + t.id + '\')" style="margin-bottom:6px;cursor:pointer">'
        + '<div class="ticket-num">🧾 ' + t.numero + (t.express ? ' <span class="tk-express">⚡ EXPRESS</span>' : '') + '</div>'
        + '<div class="ticket-client">' + escapeHtml(t.clientNom) + '</div>'
        + '<div class="ticket-articles">' + (t.lignes || []).length + ' articles · ' + fmt(t.ttc) + badgeEmplacement(t, true) + '</div>'
        + '<div class="ticket-foot"><span class="badge ' + st.cls + '">' + st.label + '</span><span class="price">Reste : ' + fmt(reste) + '</span></div>'
        + '</div>';
    }).join('')
    + '</div>';
}

function updateRetraitCalc(ticketId) {
  var d = getData();
  var t = d.tickets.filter(function (x) { return x.id === ticketId; })[0]; if (!t) return;
  var byId = {}; (t.lignes || []).forEach(function (l) { byId[l.id] = l; });
  var valueOnTicket = (t.lignes || []).reduce(function (a, l) { return a + (l.prix || 0) * (l.qte || 1); }, 0);
  var valueAlreadyTaken = Math.max(0, (t.ttc || 0) - valueOnTicket);
  var creditUnused = Math.max(0, (t.paye || 0) - valueAlreadyTaken);
  var checks = qs('.rt-art');
  var valTaken = 0, valRest = 0, nTaken = 0, nRest = 0;
  checks.forEach(function (cb) {
    var l = byId[cb.getAttribute('data-lid')]; if (!l) return;
    var v = (l.prix || 0) * (l.qte || 1);
    if (cb.checked) { valTaken += v; nTaken++; } else { valRest += v; nRest++; }
  });
  var montant = Math.max(0, valTaken - creditUnused);
  var mEl = ge('rtMontant'); if (mEl) mEl.value = montant.toFixed(2);
  var pv = ge('rtPreview');
  if (pv) pv.innerHTML = '📦 Récupéré maintenant : <b>' + fmt(valTaken) + '</b> (' + nTaken + ' article' + (nTaken > 1 ? 's' : '') + ')'
    + (nRest > 0 ? '<br>🏬 Restant au pressing : <b>' + fmt(valRest) + '</b> (' + nRest + ' article' + (nRest > 1 ? 's' : '') + ')' : '');
}
function showRetraitDetail(ticketId) {
  var d = getData();
  var t = d.tickets.filter(function (x) { return x.id === ticketId; })[0];
  if (!t) return;
  var st = getTicketStatutAffiche(t);
  var c = t.clientId ? d.clients.filter(function (x) { return x.id === t.clientId; })[0] : null;
  var reste = (t.ttc || 0) - (t.paye || 0);
  var pay = getPaiementStatus(t);

  ge('retraitResults').innerHTML = '';

  var html = '<div class="retrait-detail-head"><div><h2>🧾 ' + t.numero + '</h2>'
    + '<div class="text-muted" style="font-size:.85rem">' + escapeHtml(t.clientNom) + (c && c.tel ? ' · 📞 ' + escapeHtml(c.tel) : '') + '</div></div>'
    + '<div><span class="badge ' + st.cls + '" style="font-size:.78rem;padding:4px 10px">' + st.label + '</span></div></div>';
  if (emplacementActif() && t.emplacement) {
    html += '<div class="emp-rappel">📍 Le linge est rangé en <strong>' + escapeHtml(t.emplacement) + '</strong></div>';
  } else if (emplacementActif() && t.statut === 'pret') {
    html += '<div class="emp-rappel emp-rappel-vide">📍 Aucun emplacement enregistré pour cette commande '
      + '<button class="btn btn-sm" onclick="openEmplacementModal(\'' + t.id + '\')">Le renseigner</button></div>';
  }

  if (st.code !== 'pret' && st.code !== 'oublie') {
    html += '<div style="background:var(--warn-bg);border:1px solid var(--warn);padding:12px;border-radius:6px;margin-bottom:14px;color:#92400e"><strong>⚠️ Ce ticket n\'est pas encore prêt.</strong> Statut actuel : ' + st.label + '. Voulez-vous quand même le livrer ?</div>';
  }

  html += '<h4 style="margin-bottom:4px">📦 Articles — cochez ceux que le client emporte maintenant</h4>';
  html += '<div class="text-muted" style="font-size:.78rem;margin-bottom:8px">Décochez un article pour le laisser au pressing (retrait partiel). Le solde reste sur le ticket.</div>';
  html += '<div class="retrait-articles-list">';
  (t.lignes || []).forEach(function (l) {
    html += '<div class="retrait-article">'
      + '<input type="checkbox" class="rt-art" data-lid="' + l.id + '" checked style="width:20px;height:20px;flex:0 0 auto;cursor:pointer">'
      + '<span style="font-size:24px">' + (l.emoji || '👔') + '</span>'
      + '<span class="dl-id" style="font-size:.84rem">' + (l.tagId ? l.tagId.split('-').slice(-1)[0] : '') + '</span>'
      + '<div style="flex:1"><strong>' + escapeHtml(l.articleNom) + '</strong> · ' + escapeHtml(l.traitementNom || '')
      + (l.note ? '<br><em style="font-size:.74rem;color:var(--t3)">📝 ' + escapeHtml(l.note) + '</em>' : '')
      + '</div>'
      + '<span style="font-weight:700">' + fmt(l.prix) + '</span>'
      + '</div>';
  });
  html += '</div>';

  html += '<div class="retrait-recap"><div class="retrait-recap-box"><h4>💰 Financier</h4>'
    + '<div class="tline"><span>TTC</span><span>' + fmt(t.ttc) + '</span></div>'
    + '<div class="tline"><span>Déjà payé</span><span style="color:var(--ok)">' + fmt(t.paye || 0) + '</span></div>'
    + '<div class="tline solde" style="font-size:1.2rem"><span>RESTE À PAYER</span><span>' + fmt(reste) + '</span></div>'
    + '<div style="margin-top:8px"><span class="badge ' + pay.cls + '">' + pay.label + '</span></div></div>';

  html += '<div class="retrait-recap-box"><h4>💳 Encaissement du solde</h4>';
  if (reste > 0.01) {
    html += '<div id="rtPreview" style="font-size:.82rem;background:var(--brand-bg);border:1px solid var(--brand);border-radius:6px;padding:6px 9px;margin-bottom:6px"></div>';
    html += '<div class="form-group" style="margin-bottom:6px"><label>Montant payé maintenant (pour les vêtements pris)</label><input type="number" id="rtMontant" class="input" value="' + reste.toFixed(2) + '" min="0" step="0.01"></div>';
    html += '<div class="form-group"><label>Mode paiement</label><select id="rtPaiement" class="input"><option value="wave">🌊 Wave</option><option value="mtn">📱 MTN Money</option><option value="orange">🟠 Orange Money</option><option value="moov">🔵 Moov Money</option><option value="especes">💵 Espèces</option></select></div>';
  } else {
    html += '<div style="color:var(--ok);font-weight:600">✅ Ticket entièrement soldé</div>';
  }
  html += '</div></div>';

  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">';
  html += '<button class="btn btn-success btn-lg" onclick="confirmRetrait(\'' + t.id + '\')">✅ Valider le retrait</button>';
  if (c && (c.tel || c.email) && (st.code === 'pret' || st.code === 'oublie')) {
    html += '<button class="btn btn-info" onclick="notifyClientPret(\'' + t.id + '\')">📱 Notifier prêt</button>';
  }
  html += '<button class="btn" onclick="reprintTicketDepot(\'' + t.id + '\')">🖨️ Ré-imprimer dépôt</button>';
  html += '<button class="btn" onclick="renderRetrait()">↩️ Retour</button>';
  html += '</div>';

  var detail = ge('retraitDetail');
  detail.className = 'retrait-detail';
  detail.classList.remove('hidden');
  detail.innerHTML = html;
  qs('.rt-art').forEach(function (cb) { cb.onchange = function () { updateRetraitCalc(ticketId); }; });
  updateRetraitCalc(ticketId);
}

function confirmRetrait(ticketId) {
  var d = getData();
  var idx = d.tickets.findIndex(function (t) { return t.id === ticketId; });
  if (idx < 0) return;
  var t = d.tickets[idx];
  var checks = qs('.rt-art');
  var takenIds = {};
  checks.forEach(function (cb) { if (cb.checked) takenIds[cb.getAttribute('data-lid')] = true; });
  var allLignes = (t.lignes || []).slice();
  var taken, remaining;
  if (checks.length) {
    taken = allLignes.filter(function (l) { return takenIds[l.id]; });
    remaining = allLignes.filter(function (l) { return !takenIds[l.id]; });
  } else { taken = allLignes; remaining = []; }
  var resteAvant = (t.ttc || 0) - (t.paye || 0);
  var montant = 0, mode = 'especes';
  if (resteAvant > 0.01) {
    montant = parseFloat((ge('rtMontant') || {}).value) || 0;
    mode = (ge('rtPaiement') || {}).value || 'especes';
    if (montant < 0) montant = 0;
  }
  if (taken.length === 0 && montant <= 0) { toast('Cochez au moins un article emporté, ou saisissez un montant.', 'warn'); return; }

  /* Photographie de l'état avant l'opération : permet d'annuler exactement
     un retrait saisi par erreur, sans toucher au numéro de ticket. */
  var _avant = {
    id: 'op_' + Date.now(),
    date: now(),
    par: (typeof currentUser !== 'undefined' && currentUser && currentUser.nom) ? currentUser.nom : '',
    lignes: JSON.parse(JSON.stringify(allLignes)),
    paye: t.paye || 0,
    statut: t.statut,
    dateLivraison: t.dateLivraison || null,
    dateChangementStatut: t.dateChangementStatut || null,
    retraitPartiel: t.retraitPartiel || false,
    creanceReportee: t.creanceReportee || 0,
    paiement: t.paiement || null,
    nbPaiements: (t.paiementsHist || []).length,
    montantEncaisse: 0, pointsAjoutes: 0, creanceAjoutee: 0, clientId: t.clientId || null
  };

  if (montant > 0) {
    t.paye = (t.paye || 0) + montant;
    if (!t.paiementsHist) t.paiementsHist = [];
    t.paiementsHist.push({ date: now(), montant: montant, mode: mode, label: (remaining.length ? 'Paiement (retrait partiel)' : 'Solde au retrait') });
    t.paiement = mode;
    if (t.clientId) {
      var ci = d.clients.findIndex(function (c) { return c.id === t.clientId; });
      if (ci >= 0) {
        var fid = d.settings.fidelite || {};
        var pts = Math.floor((montant / (fid.euroParTranche || 1)) * (fid.pointsParTranche || 1));
        d.clients[ci].points = (d.clients[ci].points || 0) + pts;
        d.clients[ci].totalCA = (d.clients[ci].totalCA || 0) + montant;
        _avant.pointsAjoutes = pts;
      }
    }
  }
  t.lignes = remaining;
  var resteApres = Math.max(0, (t.ttc || 0) - (t.paye || 0));
  var creance = 0;
  if (remaining.length > 0) {
    t.statut = 'pret';
    t.dateChangementStatut = now();
    t.retraitPartiel = true;
  } else {
    t.statut = 'livre';
    t.dateChangementStatut = now();
    t.dateLivraison = now();
    libererEmplacement(t);   // le casier redevient disponible
    if (resteApres > 0.01) {
      if (t.clientId) {
        var cx = d.clients.findIndex(function (c) { return c.id === t.clientId; });
        if (cx >= 0) { d.clients[cx].creance = (d.clients[cx].creance || 0) + resteApres; creance = resteApres; t.creanceReportee = resteApres; _avant.creanceAjoutee = resteApres; }
      } else { t.creancePerdue = resteApres; }
    }
  }
  _avant.montantEncaisse = montant;
  _avant.nbArticlesRemis = taken.length;
  t.retraitsHist = t.retraitsHist || [];
  t.retraitsHist.push(_avant);

  saveData(d);
  var msg;
  if (remaining.length > 0) msg = '\uD83D\uDCE6 ' + taken.length + ' remis \u00B7 ' + remaining.length + ' au pressing \u00B7 reste ' + fmt(resteApres);
  else if (creance > 0) msg = '\u2705 Livré \u00B7 créance ' + fmt(creance) + ' reportée sur le client';
  else msg = '\u2705 Livré' + (montant > 0 ? ' — ' + fmt(montant) + ' encaissés' : ' (soldé)');
  toast(msg, 'ok');
  printRecuRetrait(t, { taken: taken, remaining: remaining, montant: montant, mode: mode, resteApres: resteApres, creance: creance });
  setTimeout(function () { renderRetrait(); }, 900);
  updateNotifs();
}

function printRecuRetrait(t, op) {
  var d = getData();
  var s = d.settings || {};
  var win = window.open('', '_blank', 'width=800,height=900');
  if (!win) { toast('Popup bloquée — autorisez les popups', 'warn'); return; }
  op = op || {};
  var arts = op.taken ? op.taken : (t.lignes || []);
  var remaining = op.remaining || [];
  var partiel = remaining.length > 0;
  var reste = (op.resteApres !== undefined && op.resteApres !== null) ? op.resteApres : Math.max(0, (t.ttc || 0) - (t.paye || 0));
  var creance = op.creance || t.creanceReportee || 0;
  var payeNow = op.montant || 0;
  var modePaie = op.mode ? payLabel(op.mode) : (t.paiement ? payLabel(t.paiement) : (t.paiementsHist && t.paiementsHist.length ? payLabel(t.paiementsHist[t.paiementsHist.length - 1].mode) : '\u2014'));
  var rows = arts.map(function (l) {
    var ref = l.tagId ? String(l.tagId).split('-').slice(-1)[0] : '';
    return '<tr><td class="c">' + escapeHtml(ref) + '</td>'
      + '<td>' + escapeHtml(l.articleNom || '') + (l.note ? '<div class="note">\uD83D\uDCDD ' + escapeHtml(l.note) + '</div>' : '') + '</td>'
      + '<td>' + escapeHtml(l.traitementNom || '') + '</td>'
      + '<td class="c">' + (l.qte || 1) + '</td>'
      + '<td class="r">' + fmt((l.prix || 0) * (l.qte || 1)) + '</td></tr>';
  }).join('');
  var restList = partiel ? '<div class="restants"><strong>\uD83D\uDCE6 Articles encore au pressing (' + remaining.length + ') :</strong> ' + remaining.map(function (l) { return escapeHtml(l.articleNom) + (l.tagId ? ' (' + String(l.tagId).split('-').slice(-1)[0] + ')' : ''); }).join(', ') + '</div>' : '';
  var histRows = (t.paiementsHist || []).map(function (p) {
    return '<div class="row"><span>' + fmtDate(p.date) + ' \u00B7 ' + payLabel(p.mode) + (p.label ? ' (' + escapeHtml(p.label) + ')' : '') + '</span><span>' + fmt(p.montant) + '</span></div>';
  }).join('');
  var logo = s.logo ? '<img src="' + s.logo + '" alt="logo" style="height:80px;margin-bottom:6px">' : '';
  var banner = partiel
    ? '<div class="partiel">\uD83D\uDCE6 RETRAIT PARTIEL — ' + remaining.length + ' article(s) restent au pressing</div>'
    : '<div class="livre">\u2705 COMMANDE LIVRÉE</div>';
  var closeBlock = partiel
    ? '<div class="row reste"><span>Reste à payer (au retrait du solde)</span><span>' + fmt(reste) + '</span></div>'
    : (creance > 0
      ? '<div class="creance">\u26A0\uFE0F Créance reportée : ' + fmt(creance) + '<div style="font-size:12px;font-weight:normal">Sera ajoutée automatiquement au prochain dépôt de ce client.</div></div>'
      : '<div class="solde">\u2705 SOLDÉ — Merci !</div>');
  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reçu retrait ' + escapeHtml(t.numero || '') + '</title><style>'
    + '@page{size:A4;margin:16mm}*{box-sizing:border-box}'
    + 'body{font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;max-width:720px;margin:0 auto;padding:10px}'
    + '.head{text-align:center;border-bottom:3px solid #1e3a8a;padding-bottom:12px;margin-bottom:14px}'
    + '.head .nom{font-size:26px;font-weight:bold;color:#1e3a8a;letter-spacing:1px}'
    + '.head .sub{font-size:14px;color:#444;margin-top:3px}'
    + '.recu-title{text-align:center;font-size:15px;letter-spacing:3px;color:#666;margin:6px 0}'
    + '.num{text-align:center;font-size:24px;font-weight:bold;border:2px solid #111;border-radius:8px;padding:8px;margin:10px auto;max-width:340px;letter-spacing:2px}'
    + '.livre{text-align:center;background:#dcfce7;border:2px solid #16a34a;color:#166534;border-radius:6px;padding:9px;font-weight:bold;margin:10px 0;font-size:16px}'
    + '.partiel{text-align:center;background:#fef3c7;border:2px solid #f59e0b;color:#92400e;border-radius:6px;padding:9px;font-weight:bold;margin:10px 0;font-size:16px}'
    + '.meta{display:flex;justify-content:space-between;font-size:14px;margin:10px 2px}'
    + 'table{width:100%;border-collapse:collapse;margin:12px 0}'
    + 'th{background:#1e3a8a;color:#fff;font-size:13px;padding:8px;text-align:left}'
    + 'td{border-bottom:1px solid #ddd;padding:8px;font-size:14px;vertical-align:top}'
    + 'td.c,th.c{text-align:center}td.r,th.r{text-align:right}'
    + '.note{font-style:italic;color:#666;font-size:12px;margin-top:2px}'
    + '.restants{margin:10px 0;padding:9px 12px;background:#fff7ed;border:1px solid #f59e0b;border-radius:6px;font-size:14px}'
    + '.totaux{margin-left:auto;max-width:360px}'
    + '.totaux .row{display:flex;justify-content:space-between;padding:5px 2px;font-size:15px}'
    + '.paie{margin-top:10px;padding:11px 14px;background:#eef2fb;border:1px solid #1e3a8a;border-radius:6px;font-size:15px}'
    + '.paie .row{display:flex;justify-content:space-between;padding:3px 0}'
    + '.paie .hist{font-size:12px;color:#555;margin:6px 0;border-top:1px dashed #bbb;border-bottom:1px dashed #bbb;padding:5px 0}'
    + '.reste{color:#c0392b;font-weight:bold}'
    + '.solde{color:#166534;font-weight:bold;text-align:center;margin-top:8px;font-size:16px}'
    + '.creance{color:#92400e;text-align:center;margin-top:8px;font-size:15px;font-weight:bold;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:8px}'
    + '.foot{text-align:center;margin-top:20px;font-size:12px;color:#555;border-top:1px dashed #aaa;padding-top:10px}'
    + 'button{margin:18px auto;display:block;padding:11px 22px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer}'
    + '@media print{button{display:none}body{max-width:none}}'
    + '</style></head><body>'
    + '<div class="head">' + logo + '<div class="nom">' + escapeHtml(s.name || '') + '</div>'
    + (s.adresse ? '<div class="sub">' + escapeHtml(s.adresse) + '</div>' : '')
    + (s.tel ? '<div class="sub">\uD83D\uDCDE ' + escapeHtml(s.tel) + '</div>' : '') + '</div>'
    + '<div class="recu-title">' + (partiel ? 'REÇU DE RETRAIT PARTIEL' : 'REÇU DE RETRAIT') + '</div>'
    + '<div class="num">\uD83E\uDDFE ' + escapeHtml(t.numero || '') + '</div>'
    + banner
    + '<div class="meta"><span>' + fmtDateTime(t.dateLivraison || now()) + '</span><span>Client : <strong>' + escapeHtml(t.clientNom || 'Passage') + '</strong></span></div>'
    + '<div style="font-weight:bold;margin:6px 2px">\uD83D\uDCE6 Articles remis (' + arts.length + ')</div>'
    + '<table><thead><tr><th class="c">Réf</th><th>Article</th><th>Traitement</th><th class="c">Qté</th><th class="r">Montant</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + restList
    + '<div class="totaux">'
    + '<div class="row"><span>Vêtements récupérés aujourd\'hui</span><span>' + fmt(arts.reduce(function (x, l) { return x + (l.prix || 0) * (l.qte || 1); }, 0)) + '</span></div>'
    + (partiel ? '<div class="row"><span>Vêtements restants au pressing</span><span>' + fmt(remaining.reduce(function (x, l) { return x + (l.prix || 0) * (l.qte || 1); }, 0)) + '</span></div>' : '')
    + '<div class="row" style="font-weight:bold;font-size:17px;border-top:2px solid #111;padding-top:8px;margin-top:4px"><span>Facture totale</span><span>' + fmt(t.ttc || 0) + '</span></div></div>'
    + '<div class="paie"><strong>\uD83D\uDCB3 Mode de paiement :</strong> ' + modePaie
    + (histRows ? '<div class="hist">' + histRows + '</div>' : '')
    + (payeNow > 0 ? '<div class="row"><span>Payé aujourd\'hui</span><span>' + fmt(payeNow) + '</span></div>' : '')
    + '<div class="row" style="font-weight:bold"><span>Total payé</span><span>' + fmt(t.paye || 0) + '</span></div>'
    + closeBlock
    + '</div>'
    + '<div class="foot">Conservez ce reçu' + (partiel ? ' pour récupérer le reste de votre linge.' : '.') + ' Merci de votre confiance !</div>'
    + '<button onclick="window.print()">\uD83D\uDDA8\uFE0F Imprimer</button>'
    + '</body></html>';
  win.document.write(h);
  win.document.close();
}

/* ══ DASHBOARD ══════════════════════════════════════════════════ */
function renderDashboard() {
  var d = getData();
  var todayStr = today();
  
  // KPI principaux
  var depots = d.tickets.filter(function (t) { return isToday(t.date); });
  var retraits = d.tickets.filter(function (t) { return t.statut === 'livre' && t.dateLivraison && isToday(t.dateLivraison); });
  
  var caJour = 0;
  // CA du jour = somme des paiements encaissés aujourd'hui
  d.tickets.forEach(function (t) {
    (t.paiementsHist || []).forEach(function (p) {
      if (isToday(p.date)) caJour += p.montant || 0;
    });
  });
  
  setTxt('kpiCaJour', fmt(caJour));
  setTxt('kpiDepots', depots.length);
  setTxt('kpiRetraits', retraits.length);
  
  var enAttente = d.tickets.filter(function (t) { return t.statut === 'pret'; }).length;
  setTxt('kpiAttente', enAttente);
  
  // Statuts
  var byStatut = { recu: 0, traitement: 0, pret: 0, oublie: 0 };
  d.tickets.forEach(function (t) {
    if (t.statut === 'livre' || t.statut === 'annule') return;
    var st = getTicketStatutAffiche(t);
    if (st.code === 'oublie') byStatut.oublie++;
    else if (byStatut[t.statut] !== undefined) byStatut[t.statut]++;
  });
  setTxt('kpiRecu', byStatut.recu);
  setTxt('kpiTraitement', byStatut.traitement);
  setTxt('kpiPretsKpi', byStatut.pret);
  setTxt('kpiOublies', byStatut.oublie);
  
  // CA du mois
  var caMois = 0;
  d.tickets.forEach(function (t) {
    (t.paiementsHist || []).forEach(function (p) {
      if (isThisMonth(p.date)) caMois += p.montant || 0;
    });
  });
  setTxt('kpiCaMois', fmt(caMois));
  
  // Top 5 articles du jour
  var top = {};
  retraits.concat(depots).forEach(function (t) {
    (t.lignes || []).forEach(function (l) {
      var k = l.articleNom;
      if (!top[k]) top[k] = { nom: l.articleNom, emoji: l.emoji, qte: 0, ca: 0 };
      top[k].qte += l.qte || 1;
      top[k].ca += l.prix * (l.qte || 1);
    });
  });
  var topArr = Object.values(top).sort(function (a, b) { return b.qte - a.qte; }).slice(0, 5);
  ge('dashTop5').innerHTML = topArr.length
    ? topArr.map(function (t, i) {
      return '<li class="top-item" style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid var(--bdr-l)">'
        + '<span style="font-weight:700;color:var(--brand);width:22px">' + (i + 1) + '.</span>'
        + '<span style="font-size:18px">' + (t.emoji || '👔') + '</span>'
        + '<span style="flex:1">' + escapeHtml(t.nom) + '</span>'
        + '<span style="color:var(--t3);font-size:.84rem">' + t.qte + ' art.</span>'
        + '<span style="font-weight:700;color:var(--brand)">' + fmt(t.ca) + '</span>'
        + '</li>';
    }).join('')
    : '<li class="top-item" style="justify-content:center;color:var(--t3);padding:14px;text-align:center">Aucune activité aujourd\'hui</li>';
  
  // Prêts à retirer (aujourd'hui ou avant)
  var aRetirer = d.tickets.filter(function (t) {
    if (t.statut !== 'pret') return false;
    if (!t.delaiRetrait) return true; // Pas de délai = afficher quand même
    return new Date(t.delaiRetrait) <= new Date(todayStr);
  }).slice(0, 6);
  ge('dashPrets').innerHTML = aRetirer.length
    ? aRetirer.map(function (t) {
      var delay = getDelayStatus(t);
      return '<div class="ticket-card" onclick="openTicketDetail(\'' + t.id + '\')" style="margin-bottom:6px">'
        + '<div class="ticket-num">🧾 ' + t.numero + (t.express ? ' <span class="tk-express">⚡ EXPRESS</span>' : '') + '</div>'
        + '<div class="ticket-client">' + escapeHtml(t.clientNom) + '</div>'
        + '<div class="ticket-foot"><span class="price">' + fmt(t.ttc) + '</span>' + (delay ? '<span class="delay ' + delay.cls + '">' + delay.label + '</span>' : '') + '</div>'
        + '</div>';
    }).join('')
    : '<div style="text-align:center;color:var(--t3);padding:14px">Aucun ticket à retirer</div>';
  
  // Tickets oubliés
  var oublies = d.tickets.filter(function (t) {
    if (t.statut !== 'pret') return false;
    if (!t.dateChangementStatut) return false;
    return daysBetween(t.dateChangementStatut, now()) >= 30;
  }).slice(0, 6);
  ge('dashOublies').innerHTML = oublies.length
    ? oublies.map(function (t) {
      var jrs = daysBetween(t.dateChangementStatut, now());
      return '<div class="ticket-card" onclick="openTicketDetail(\'' + t.id + '\')" style="margin-bottom:6px;border-left:4px solid var(--err)">'
        + '<div class="ticket-num" style="color:var(--err)">🚨 ' + t.numero + '</div>'
        + '<div class="ticket-client">' + escapeHtml(t.clientNom) + '</div>'
        + '<div class="ticket-foot"><span class="price">' + fmt(t.ttc) + '</span><span style="color:var(--err);font-weight:700">' + jrs + ' jours</span></div>'
        + '</div>';
    }).join('')
    : '<div style="text-align:center;color:var(--t3);padding:14px">✅ Aucun ticket oublié</div>';
  
  renderDashChart7j(d);
}

function renderDashChart7j(d) {
  var labels = []; var data = [];
  for (var i = 6; i >= 0; i--) {
    var dt = new Date(); dt.setDate(dt.getDate() - i);
    var ds = dt.toISOString().slice(0, 10);
    labels.push(dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
    var ca = 0;
    d.tickets.forEach(function (t) {
      (t.paiementsHist || []).forEach(function (p) {
        if (p.date && p.date.slice(0, 10) === ds) ca += p.montant || 0;
      });
    });
    data.push(ca);
  }
  var ctx = ge('chartDash7j'); if (!ctx || typeof Chart === 'undefined') return;
  if (charts.dash7j) charts.dash7j.destroy();
  charts.dash7j = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: [{ label: 'CA', data: data, backgroundColor: 'rgba(14,165,233,.6)', borderColor: '#0ea5e9', borderWidth: 1, borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

/* ══ HISTORIQUE ═════════════════════════════════════════════════ */
function renderHistorique() {
  var d = getData();
  var deb = ge('histDateDeb') ? ge('histDateDeb').value : '';
  var fin = ge('histDateFin') ? ge('histDateFin').value : '';
  var statut = ge('histStatut') ? ge('histStatut').value : '';
  var paiement = ge('histPaiement') ? ge('histPaiement').value : '';
  var q = (ge('histSearch') ? ge('histSearch').value : '').toLowerCase().trim();
  
  /* Compteur de la corbeille, affiché dans le filtre lui-même */
  var nbCorbeille = (d.corbeille || []).length;
  var optCorb = ge('histStatut') ? ge('histStatut').querySelector('option[value="supprimes"]') : null;
  if (optCorb) optCorb.textContent = '🗑 Corbeille' + (nbCorbeille ? ' (' + nbCorbeille + ')' : '');

  var modeCorbeille = (statut === 'supprimes');
  var source = modeCorbeille ? (d.corbeille || []) : d.tickets;
  var list = source.slice().sort(function (a, b) {
    if (modeCorbeille) return new Date(b.supprimeLe || b.date) - new Date(a.supprimeLe || a.date);
    return new Date(b.date) - new Date(a.date);
  });
  if (deb) list = list.filter(function (t) { return t.date >= deb; });
  if (fin) list = list.filter(function (t) { return t.date.slice(0, 10) <= fin; });
  if (statut && !modeCorbeille) list = list.filter(function (t) {
    if (statut === 'oublie') {
      var st = getTicketStatutAffiche(t);
      return st.code === 'oublie';
    }
    return t.statut === statut;
  });
  if (paiement === 'corriges') list = list.filter(function (t) { return (t.corrections || []).length > 0; });
  else if (paiement) list = list.filter(function (t) {
    var pay = getPaiementStatus(t);
    return pay.code === paiement;
  });
  if (q) list = list.filter(function (t) {
    return (t.numero || '').toLowerCase().includes(q) || (t.clientNom || '').toLowerCase().includes(q);
  });
  
  var tb = ge('histBody'); if (!tb) return;

  /* Bandeau d'explication en mode corbeille */
  var ban = ge('histCorbeilleBanner');
  if (ban) {
    ban.style.display = modeCorbeille ? 'flex' : 'none';
    if (modeCorbeille) {
      ban.innerHTML = '<div><strong>🗑 Corbeille — ' + nbCorbeille + ' ticket(s) supprimé(s)</strong>'
        + '<div style="font-size:.78rem;margin-top:2px">Un client réclame ses vêtements et son ticket a disparu ? '
        + 'Restaurez-le ici : il revient dans l\'historique avec ses articles et ses paiements, '
        + 'et vous pouvez éditer la facture puis procéder au retrait.</div></div>'
        + '<button class="btn btn-sm btn-danger" onclick="viderCorbeille()">Vider la corbeille</button>';
    }
  }

  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--t3);padding:30px">'
      + (modeCorbeille ? 'La corbeille est vide. Aucun ticket n\'a été supprimé.' : 'Aucun ticket trouvé.')
      + '</td></tr>';
  } else if (modeCorbeille) {
    tb.innerHTML = list.map(function (t) {
      var st = getTicketStatutAffiche(t);
      var pay = getPaiementStatus(t);
      var nbArt = (t.lignes || []).length;
      var resume = (t.lignes || []).slice(0, 2).map(function (l) { return l.emoji + escapeHtml(l.articleNom); }).join(', ');
      if (nbArt > 2) resume += ' +' + (nbArt - 2);
      var reste = (t.ttc || 0) - (t.paye || 0);
      var alerte = (t.statut !== 'livre')
        ? '<div style="font-size:.72rem;color:var(--danger);font-weight:600">⚠ vêtements non retirés</div>' : '';
      return '<tr style="background:rgba(239,68,68,.04)">'
        + '<td><strong>' + t.numero + '</strong>' + alerte + '</td>'
        + '<td>' + fmtDateTime(t.date) + '<div style="font-size:.7rem;color:var(--t3)">supprimé le '
          + (t.supprimeLe ? fmtDateTime(t.supprimeLe) : '—')
          + (t.supprimePar ? ' par ' + escapeHtml(t.supprimePar) : '') + '</div></td>'
        + '<td>' + escapeHtml(t.clientNom) + '</td>'
        + '<td style="font-size:.78rem;color:var(--t2)">' + resume + '</td>'
        + '<td class="num"><strong>' + fmt(t.ttc) + '</strong></td>'
        + '<td class="num"><span style="color:var(--ok)">' + fmt(t.paye || 0) + '</span>'
          + (reste > 0 ? '<div style="font-size:.7rem;color:var(--danger)">reste ' + fmt(reste) + '</div>' : '') + '</td>'
        + '<td><span class="badge ' + st.cls + '">' + st.label + '</span></td>'
        + '<td><span class="badge ' + pay.cls + '">' + pay.label + '</span></td>'
        + '<td class="col-actions">'
        + '<button class="btn btn-sm btn-primary" onclick="restaurerTicket(\'' + t.id + '\')" title="Restaurer">↩️ Restaurer</button> '
        + '<button class="btn btn-sm btn-danger" onclick="purgerTicket(\'' + t.id + '\')" title="Effacer définitivement">🗑</button>'
        + '</td></tr>';
    }).join('');
  } else {
    tb.innerHTML = list.map(function (t) {
      var st = getTicketStatutAffiche(t);
      var pay = getPaiementStatus(t);
      var nbArt = (t.lignes || []).length;
      var resume = (t.lignes || []).slice(0, 2).map(function (l) { return l.emoji + escapeHtml(l.articleNom); }).join(', ');
      if (nbArt > 2) resume += ' +' + (nbArt - 2);
      return '<tr>'
        + '<td><strong>' + t.numero + '</strong>'
          + (emplacementActif() && t.emplacement ? '<div class="emp-inline">📍 ' + escapeHtml(t.emplacement) + '</div>' : '') + '</td>'
        + '<td>' + fmtDateTime(t.date) + '</td>'
        + '<td>' + escapeHtml(t.clientNom) + '</td>'
        + '<td style="font-size:.78rem;color:var(--t2)">' + resume + '</td>'
        + '<td class="num"><strong>' + fmt(t.ttc) + '</strong></td>'
        + '<td class="num"><span style="color:var(--ok)">' + fmt(t.paye || 0) + '</span></td>'
        + '<td><span class="badge ' + st.cls + '">' + st.label + '</span></td>'
        + '<td><span class="badge ' + pay.cls + '">' + pay.label + '</span></td>'
        + '<td class="col-actions">'
        + '<button class="btn btn-sm" onclick="openTicketDetail(\'' + t.id + '\')" title="Détail">👁</button> '
        + '<button class="btn btn-sm" onclick="reprintTicketDepot(\'' + t.id + '\')" title="Imprimer">🖨️</button> '
        + '<button class="btn btn-sm btn-danger" onclick="deleteTicket(\'' + t.id + '\')" title="Supprimer">🗑</button>'
        + '</td></tr>';
    }).join('');
  }
  
  var caTot = list.reduce(function (s, t) { return s + (t.paye || 0); }, 0);
  var nbTot = list.length;
  var sm = ge('histSummary');
  if (sm) {
    if (modeCorbeille) {
      var nonLivres = list.filter(function (t) { return t.statut !== 'livre'; }).length;
      var resteTot = list.reduce(function (s, t) { return s + Math.max(0, (t.ttc || 0) - (t.paye || 0)); }, 0);
      sm.innerHTML = '<strong>' + nbTot + '</strong> ticket(s) en corbeille · '
        + '<strong style="color:var(--danger)">' + nonLivres + '</strong> avec des vêtements non retirés · '
        + 'reste à encaisser <strong>' + fmt(resteTot) + '</strong>';
    } else {
      sm.innerHTML = '<strong>' + nbTot + '</strong> ticket(s) · CA encaissé <strong>' + fmt(caTot) + '</strong>'
        + (nbCorbeille ? ' · <span style="color:var(--t3)">🗑 ' + nbCorbeille
            + ' dans la corbeille (filtre « Corbeille » pour les récupérer)</span>' : '');
    }
  }
  
  ge('btnHistFilter').onclick = renderHistorique;
  ge('btnHistReset').onclick = function () {
    ['histDateDeb', 'histDateFin', 'histStatut', 'histPaiement', 'histSearch'].forEach(function (id) {
      var el = ge(id); if (el) el.value = '';
    });
    renderHistorique();
  };
  ge('btnExportHistCSV').onclick = function () {
    var rows = [['Numero', 'Date', 'Client', 'Articles', 'HT', 'Remise', 'TVA', 'TTC', 'Paye', 'Statut', 'Paiement']];
    list.forEach(function (t) {
      var st = getTicketStatutAffiche(t);
      var pay = getPaiementStatus(t);
      rows.push([t.numero, fmtDateTime(t.date), t.clientNom, (t.lignes || []).length, t.ht || 0, t.remise || 0, t.tva || 0, t.ttc || 0, t.paye || 0, st.label, pay.label]);
    });
    downloadCSV(rows, (modeCorbeille ? 'corbeille-' : 'historique-') + today() + '.csv');
  };
}

/* Suppression = mise en corbeille. Le ticket sort de l'historique actif,
   des statistiques et de la clôture, mais reste récupérable : si le client
   revient chercher ses vêtements, on retrouve la ligne. */
function deleteTicket(id) {
  var d0 = getData();
  var t0 = d0.tickets.filter(function (t) { return t.id === id; })[0];
  if (!t0) return;
  var reste = (t0.ttc || 0) - (t0.paye || 0);
  var alerte = '';
  if (t0.statut !== 'livre') alerte += 'Ce ticket n\'est PAS livré : les vêtements sont peut-être encore au pressing. ';
  if (reste > 0) alerte += 'Il reste ' + fmt(reste) + ' à encaisser. ';
  showConfirm('Mettre ce ticket à la corbeille ?',
    alerte + 'Le ticket sortira de l\'historique et des statistiques, mais vous pourrez le restaurer à tout moment depuis le filtre « Corbeille ».',
    function () {
      var d = getData();
      var idx = d.tickets.findIndex(function (t) { return t.id === id; });
      if (idx < 0) return;
      var t = d.tickets[idx];
      t.supprimeLe = now();
      t.supprimePar = (typeof currentUser !== 'undefined' && currentUser && currentUser.nom) ? currentUser.nom : '';
      d.corbeille = d.corbeille || [];
      d.corbeille.unshift(t);
      d.tickets.splice(idx, 1);
      saveData(d);
      toast('Ticket mis à la corbeille — récupérable', 'ok');
      renderHistorique();
      updateNotifs();
    });
}

/* ══ CORRECTION D'UN RETRAIT SAISI PAR ERREUR ═══════════════════
   Cas typique : le client n'est jamais venu, mais la réception a
   validé le retrait et le solde. Le ticket affiche « Soldé / Livré »
   alors que les habits sont encore là. On rétablit l'état exact
   d'avant l'opération, en gardant le MÊME numéro de ticket. */
function annulerDernierRetrait(ticketId) {
  var d0 = getData();
  var t0 = d0.tickets.filter(function (x) { return x.id === ticketId; })[0];
  if (!t0 || !(t0.retraitsHist || []).length) { toast('Aucun retrait à annuler sur ce ticket', 'warn'); return; }
  var op0 = t0.retraitsHist[t0.retraitsHist.length - 1];
  var detail = [];
  if (op0.montantEncaisse > 0) detail.push('le paiement de ' + fmt(op0.montantEncaisse) + ' sera retiré de la caisse');
  if (op0.nbArticlesRemis > 0) detail.push(op0.nbArticlesRemis + ' article(s) reviendront sur le ticket');
  if (op0.creanceAjoutee > 0) detail.push('la créance de ' + fmt(op0.creanceAjoutee) + ' sera annulée sur la fiche client');
  if (op0.pointsAjoutes > 0) detail.push(op0.pointsAjoutes + ' point(s) de fidélité seront repris');

  showConfirm('Annuler ce retrait ?',
    'Le ticket ' + t0.numero + ' retrouvera exactement son état d\'avant le retrait du '
    + fmtDateTime(op0.date) + ' : ' + (detail.length ? detail.join(', ') + '. ' : '')
    + 'Le numéro de ticket, le client et les articles ne changent pas.',
    function () {
      var d = getData();
      var idx = d.tickets.findIndex(function (x) { return x.id === ticketId; });
      if (idx < 0) return;
      var t = d.tickets[idx];
      var op = t.retraitsHist[t.retraitsHist.length - 1];

      /* Articles, paiement et statut reviennent à l'identique */
      t.lignes = JSON.parse(JSON.stringify(op.lignes));
      t.paye = op.paye;
      t.statut = op.statut;
      t.dateLivraison = op.dateLivraison;
      t.dateChangementStatut = op.dateChangementStatut;
      t.retraitPartiel = op.retraitPartiel;
      t.creanceReportee = op.creanceReportee;
      t.paiement = op.paiement;

      /* Le paiement enregistré lors du retrait sort de l'historique et de la caisse */
      if ((t.paiementsHist || []).length > op.nbPaiements) {
        t.paiementsHist = t.paiementsHist.slice(0, op.nbPaiements);
      }

      /* Fidélité et créance du client remises comme avant */
      if (op.clientId) {
        var ci = d.clients.findIndex(function (c) { return c.id === op.clientId; });
        if (ci >= 0) {
          if (op.pointsAjoutes) d.clients[ci].points = Math.max(0, (d.clients[ci].points || 0) - op.pointsAjoutes);
          if (op.montantEncaisse) d.clients[ci].totalCA = Math.max(0, (d.clients[ci].totalCA || 0) - op.montantEncaisse);
          if (op.creanceAjoutee) d.clients[ci].creance = Math.max(0, (d.clients[ci].creance || 0) - op.creanceAjoutee);
        }
      }

      /* Trace de la correction, pour savoir qui a fait quoi */
      t.corrections = t.corrections || [];
      t.corrections.push({
        date: now(), type: 'annulation-retrait',
        par: (typeof currentUser !== 'undefined' && currentUser && currentUser.nom) ? currentUser.nom : '',
        montantAnnule: op.montantEncaisse, articlesRendus: op.nbArticlesRemis
      });
      t.retraitsHist.pop();

      saveData(d);
      toast('Retrait annulé — ticket ' + t.numero + ' remis en attente', 'ok');
      ge('modalTicketDetail').classList.add('hidden');
      try { renderHistorique(); } catch (e) {}
      try { renderRetrait(); } catch (e) {}
      updateNotifs();
      setTimeout(function () { openTicketDetail(ticketId); }, 200);
    }, '↩️');
}

/* Retirer un paiement précis (erreur de saisie au dépôt, double encaissement…) */
function annulerPaiement(ticketId, index) {
  var d0 = getData();
  var t0 = d0.tickets.filter(function (x) { return x.id === ticketId; })[0];
  if (!t0 || !(t0.paiementsHist || [])[index]) return;
  var pmt = t0.paiementsHist[index];
  showConfirm('Retirer ce paiement de ' + fmt(pmt.montant) + ' ?',
    'Il sera enlevé de l\'historique du ticket et de la caisse du jour. Le reste à payer sera recalculé. '
    + 'À n\'utiliser qu\'en cas d\'erreur de saisie.',
    function () {
      var d = getData();
      var idx = d.tickets.findIndex(function (x) { return x.id === ticketId; });
      if (idx < 0) return;
      var t = d.tickets[idx];
      var p = (t.paiementsHist || [])[index];
      if (!p) return;
      t.paiementsHist.splice(index, 1);
      t.paye = Math.max(0, (t.paye || 0) - (p.montant || 0));
      if (t.clientId) {
        var ci = d.clients.findIndex(function (c) { return c.id === t.clientId; });
        if (ci >= 0) {
          var fid = d.settings.fidelite || {};
          var pts = Math.floor(((p.montant || 0) / (fid.euroParTranche || 1)) * (fid.pointsParTranche || 1));
          d.clients[ci].points = Math.max(0, (d.clients[ci].points || 0) - pts);
          d.clients[ci].totalCA = Math.max(0, (d.clients[ci].totalCA || 0) - (p.montant || 0));
        }
      }
      t.corrections = t.corrections || [];
      t.corrections.push({ date: now(), type: 'annulation-paiement',
        par: (typeof currentUser !== 'undefined' && currentUser && currentUser.nom) ? currentUser.nom : '',
        montantAnnule: p.montant });
      saveData(d);
      toast('Paiement de ' + fmt(p.montant) + ' retiré', 'ok');
      ge('modalTicketDetail').classList.add('hidden');
      try { renderHistorique(); } catch (e) {}
      updateNotifs();
      setTimeout(function () { openTicketDetail(ticketId); }, 200);
    }, '↩️');
}

/* Remettre un ticket livré dans le circuit sans toucher aux paiements */
function remettreEnPret(ticketId) {
  var d0 = getData();
  var t0 = d0.tickets.filter(function (x) { return x.id === ticketId; })[0];
  if (!t0) return;
  showConfirm('Remettre le ticket ' + t0.numero + ' en « Prêt » ?',
    'Le ticket repassera en attente de retrait et réapparaîtra dans l\'écran Retrait. '
    + 'Les paiements déjà enregistrés ne sont pas modifiés — utilisez « Annuler le retrait » si le paiement est aussi une erreur.',
    function () {
      var d = getData();
      var idx = d.tickets.findIndex(function (x) { return x.id === ticketId; });
      if (idx < 0) return;
      d.tickets[idx].statut = 'pret';
      d.tickets[idx].dateChangementStatut = now();
      d.tickets[idx].dateLivraison = null;
      saveData(d);
      toast('Ticket remis en attente de retrait', 'ok');
      ge('modalTicketDetail').classList.add('hidden');
      try { renderHistorique(); } catch (e) {}
      updateNotifs();
      setTimeout(function () { openTicketDetail(ticketId); }, 200);
    }, '↩️');
}

/* Restauration : le ticket revient dans l'historique tel qu'il était.
   On peut alors éditer, imprimer la facture, encaisser et remettre les habits. */
function restaurerTicket(id) {
  var d0 = getData();
  var t0 = (d0.corbeille || []).filter(function (t) { return t.id === id; })[0];
  if (!t0) return;
  showConfirm('Restaurer le ticket ' + t0.numero + ' ?',
    'Il réapparaîtra dans l\'historique avec son statut, ses articles et ses paiements. Vous pourrez imprimer la facture et procéder au retrait.',
    function () {
      var d = getData();
      var idx = (d.corbeille || []).findIndex(function (t) { return t.id === id; });
      if (idx < 0) return;
      var t = d.corbeille[idx];
      /* On garde la trace du passage en corbeille, sans polluer le ticket */
      t.restaureLe = now();
      delete t.supprimeLe;
      delete t.supprimePar;
      /* Un même numéro ne peut pas exister deux fois */
      if (d.tickets.some(function (x) { return x.numero === t.numero; })) {
        t.numero = t.numero + '-R';
      }
      d.tickets.push(t);
      d.corbeille.splice(idx, 1);
      saveData(d);
      toast('Ticket ' + t.numero + ' restauré', 'ok');
      if (ge('histStatut')) ge('histStatut').value = '';
      renderHistorique();
      updateNotifs();
      setTimeout(function () { openTicketDetail(t.id); }, 220);
    });
}

/* Suppression réellement définitive, uniquement depuis la corbeille */
function purgerTicket(id) {
  var d0 = getData();
  var t0 = (d0.corbeille || []).filter(function (t) { return t.id === id; })[0];
  if (!t0) return;
  showConfirm('Effacer définitivement ' + t0.numero + ' ?',
    'Cette fois le ticket sera perdu pour de bon : plus aucune trace du client, des articles ni des paiements. Ne le faites que pour un ticket saisi par erreur.',
    function () {
      var d = getData();
      d.corbeille = (d.corbeille || []).filter(function (t) { return t.id !== id; });
      saveData(d);
      toast('Ticket effacé définitivement', 'warn');
      renderHistorique();
    }, '🗑');
}

function viderCorbeille() {
  var d0 = getData();
  var n = (d0.corbeille || []).length;
  if (!n) { toast('La corbeille est déjà vide', 'ok'); return; }
  showConfirm('Vider toute la corbeille ?',
    'Les ' + n + ' ticket(s) supprimés seront perdus définitivement. Vérifiez d\'abord qu\'aucun client n\'attend ses vêtements.',
    function () {
      var d = getData();
      d.corbeille = [];
      saveData(d);
      toast('Corbeille vidée', 'warn');
      renderHistorique();
    }, '🗑');
}

/* ══ CLÔTURE Z ══════════════════════════════════════════════════ */
function renderCloture() {
  var d = getData();
  var todayStr = today();
  
  // Tickets liés au jour
  var depots = d.tickets.filter(function (t) { return isToday(t.date); });
  var retraits = d.tickets.filter(function (t) { return t.statut === 'livre' && t.dateLivraison && isToday(t.dateLivraison); });
  
  // Paiements du jour (toutes sources confondues)
  var paiements = [];
  d.tickets.forEach(function (t) {
    (t.paiementsHist || []).forEach(function (p) {
      if (isToday(p.date)) paiements.push({ montant: p.montant, mode: p.mode, ticket: t.numero, label: p.label });
    });
  });
  
  var caTotal = paiements.reduce(function (s, p) { return s + (p.montant || 0); }, 0);
  var caHT = caTotal / (1 + getTva() / 100);
  var tva = caTotal - caHT;
  
  setTxt('clotureDateLabel', 'Rapport du ' + new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  
  ge('zCA').innerHTML =
    '<div class="z-line"><span>CA HT</span><strong>' + fmt(caHT) + '</strong></div>'
    + '<div class="z-line"><span>TVA collectée</span><strong>' + fmt(tva) + '</strong></div>'
    + '<div class="z-line"><span>CA TTC</span><strong>' + fmt(caTotal) + '</strong></div>';
  
  // Paiements par mode
  var pays = {};
  paiements.forEach(function (p) {
    var k = p.mode || 'autre';
    pays[k] = (pays[k] || 0) + (p.montant || 0);
  });
  var payHtml = Object.keys(pays).length ? Object.keys(pays).map(function (k) {
    return '<div class="z-line"><span class="pay-badge pay-' + k + '">' + payLabel(k) + '</span><strong>' + fmt(pays[k]) + '</strong></div>';
  }).join('') : '<div style="color:var(--t3);text-align:center;padding:10px">Aucun paiement</div>';
  ge('zPaiements').innerHTML = payHtml;
  
  // Activité
  var nbArticlesDeposes = depots.reduce(function (s, t) { return s + (t.lignes || []).length; }, 0);
  var nbArticlesRetires = retraits.reduce(function (s, t) { return s + (t.lignes || []).length; }, 0);
  ge('zActivite').innerHTML =
    '<div class="z-line"><span>Tickets créés</span><strong>' + depots.length + '</strong></div>'
    + '<div class="z-line"><span>Articles déposés</span><strong>' + nbArticlesDeposes + '</strong></div>'
    + '<div class="z-line"><span>Tickets livrés</span><strong>' + retraits.length + '</strong></div>'
    + '<div class="z-line"><span>Articles retirés</span><strong>' + nbArticlesRetires + '</strong></div>';
  
  // Synthèse
  ge('zSynthese').innerHTML =
    '<div class="z-line"><span>Encaissé total</span><strong>' + fmt(caTotal) + '</strong></div>'
    + '<div class="z-line"><span>Acomptes (dépôts)</span><strong>' + fmt(paiements.filter(function (p) { return p.label && p.label.includes('Acompte'); }).reduce(function (s, p) { return s + p.montant; }, 0)) + '</strong></div>'
    + '<div class="z-line"><span>Soldes (retraits)</span><strong>' + fmt(paiements.filter(function (p) { return p.label && p.label.includes('Solde'); }).reduce(function (s, p) { return s + p.montant; }, 0)) + '</strong></div>';
  
  // Top traitements
  var topT = {};
  depots.concat(retraits).forEach(function (t) {
    (t.lignes || []).forEach(function (l) {
      var k = l.traitementNom || 'Autre';
      if (!topT[k]) topT[k] = { nom: k, qte: 0, ca: 0 };
      topT[k].qte += l.qte || 1;
      topT[k].ca += l.prix * (l.qte || 1);
    });
  });
  var topTArr = Object.values(topT).sort(function (a, b) { return b.ca - a.ca; }).slice(0, 5);
  ge('zTop').innerHTML = topTArr.length
    ? topTArr.map(function (t, i) { return '<div class="z-line"><span>' + (i + 1) + '. ' + escapeHtml(t.nom) + '</span><strong>' + t.qte + ' · ' + fmt(t.ca) + '</strong></div>'; }).join('')
    : '<div style="color:var(--t3);text-align:center;padding:10px">—</div>';
  
  renderClotureArchives();
  ge('btnClotureAujourd').onclick = renderCloture;
  ge('btnPrintZ').onclick = printTicketZ;
  ge('btnClotureSave').onclick = saveCloture;
}

function saveCloture() {
  var d = getData();
  var todayStr = today();
  var existing = (d.closings || []).filter(function (c) { return c.date === todayStr; })[0];
  if (existing) {
    showConfirm('Une clôture existe déjà pour aujourd\'hui', 'Voulez-vous la remplacer ?', function () { _saveClotureDo(); });
    return;
  }
  _saveClotureDo();
}

function _saveClotureDo() {
  var d = getData();
  var todayStr = today();
  var depots = d.tickets.filter(function (t) { return isToday(t.date); });
  var retraits = d.tickets.filter(function (t) { return t.statut === 'livre' && t.dateLivraison && isToday(t.dateLivraison); });
  var paiements = [];
  d.tickets.forEach(function (t) {
    (t.paiementsHist || []).forEach(function (p) {
      if (isToday(p.date)) paiements.push({ montant: p.montant, mode: p.mode });
    });
  });
  var caTotal = paiements.reduce(function (s, p) { return s + (p.montant || 0); }, 0);
  var pays = {};
  paiements.forEach(function (p) { pays[p.mode] = (pays[p.mode] || 0) + (p.montant || 0); });
  var clo = {
    id: uid(), date: todayStr, dateClose: now(),
    depots: depots.length, retraits: retraits.length,
    caTTC: caTotal, paiements: pays
  };
  if (!d.closings) d.closings = [];
  d.closings = d.closings.filter(function (c) { return c.date !== todayStr; });
  d.closings.push(clo);
  saveData(d);
  toast('💾 Clôture archivée', 'ok');
  renderClotureArchives();
}

function renderClotureArchives() {
  var d = getData();
  var list = (d.closings || []).slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  var tb = ge('cloArchivesBody'); if (!tb) return;
  if (!list.length) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:18px">Aucune clôture archivée.</td></tr>'; return; }
  tb.innerHTML = list.map(function (c) {
    return '<tr>'
      + '<td>' + fmtDate(c.date) + '</td>'
      + '<td class="num">' + fmt(c.caTTC) + '</td>'
      + '<td class="num">' + (c.depots || 0) + '</td>'
      + '<td class="num">' + (c.retraits || 0) + '</td>'
      + '<td class="col-actions"><button class="btn btn-sm btn-danger" onclick="deleteCloture(\'' + c.id + '\')">🗑</button></td>'
      + '</tr>';
  }).join('');
}

function deleteCloture(id) {
  showConfirm('Supprimer cette clôture archivée ?', '', function () {
    var d = getData();
    d.closings = (d.closings || []).filter(function (c) { return c.id !== id; });
    saveData(d);
    toast('Supprimée', 'ok');
    renderClotureArchives();
  });
}

function printTicketZ() {
  var d = getData();
  var s = d.settings;
  var depots = d.tickets.filter(function (t) { return isToday(t.date); });
  var retraits = d.tickets.filter(function (t) { return t.statut === 'livre' && t.dateLivraison && isToday(t.dateLivraison); });
  var paiements = [];
  d.tickets.forEach(function (t) {
    (t.paiementsHist || []).forEach(function (p) {
      if (isToday(p.date)) paiements.push({ montant: p.montant, mode: p.mode, ticket: t.numero });
    });
  });
  var caTotal = paiements.reduce(function (s, p) { return s + (p.montant || 0); }, 0);
  var pays = {};
  paiements.forEach(function (p) { pays[p.mode] = (pays[p.mode] || 0) + (p.montant || 0); });
  
  var win = window.open('', '_blank', 'width=420,height=720');
  if (!win) { toast('Popup bloquée', 'warn'); return; }
  win.document.write('<html><head><title>Ticket Z</title><style>body{font-family:"Courier New",monospace;font-size:12px;padding:14px;max-width:300px;margin:auto}h1{text-align:center;font-size:15px;margin-bottom:6px}h2{text-align:center;font-size:11px;color:#666;margin-bottom:14px}.line{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ccc}.tot{font-weight:bold;font-size:14px;border-top:2px solid #000;padding-top:6px;margin-top:6px}.section{margin-top:14px;font-weight:bold;text-transform:uppercase;font-size:11px;color:#666}@media print{button{display:none}}</style></head><body>');
  win.document.write('<h1>🧾 TICKET Z</h1><h2>' + escapeHtml(s.name) + '<br>' + new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</h2>');
  win.document.write('<div class="section">CHIFFRE D\'AFFAIRES</div>');
  win.document.write('<div class="line tot"><span>CA TTC encaissé</span><span>' + fmt(caTotal) + '</span></div>');
  win.document.write('<div class="section">PAIEMENTS</div>');
  Object.keys(pays).forEach(function (k) { win.document.write('<div class="line"><span>' + payLabel(k) + '</span><span>' + fmt(pays[k]) + '</span></div>'); });
  win.document.write('<div class="section">ACTIVITÉ</div>');
  win.document.write('<div class="line"><span>Tickets créés</span><span>' + depots.length + '</span></div>');
  win.document.write('<div class="line"><span>Tickets livrés</span><span>' + retraits.length + '</span></div>');
  win.document.write('<div class="line"><span>Paiements enregistrés</span><span>' + paiements.length + '</span></div>');
  win.document.write('<div style="text-align:center;margin-top:16px;font-size:10px;color:#666">PressingPro v1.0 — MAS_DATA</div>');
  win.document.write('<button onclick="window.print()" style="margin:14px auto;display:block;padding:8px 16px">🖨️ Imprimer</button>');
  win.document.write('</body></html>');
  win.document.close();
}

/* ══ CLIENTS ════════════════════════════════════════════════════ */
function renderClients() {
  renderClientList();
  renderFidelite();
  bindClientEvents();
}

function bindClientEvents() {
  var s = ge('clientSearch'); if (s) s.oninput = renderClientList;
  var bA = ge('btnAddClient'); if (bA) bA.onclick = function () { openClientModal(null); };
  var bE = ge('btnExportClients'); if (bE) bE.onclick = exportClientsCSV;
  var bF = ge('btnSaveFidelite'); if (bF) bF.onclick = saveFideliteRules;
  var bN = ge('btnNotifList'); if (bN) bN.onclick = notifyAllPrets;
  var d = getData();
  var fid = d.settings.fidelite || {};
  if (ge('fidRegleEuro')) ge('fidRegleEuro').value = fid.euroParTranche || 1;
  if (ge('fidReglePoints')) ge('fidReglePoints').value = fid.pointsParTranche || 1;
  if (ge('fidRegleSilver')) ge('fidRegleSilver').value = fid.seuilSilver || 100;
  if (ge('fidRegleGold')) ge('fidRegleGold').value = fid.seuilGold || 500;
}

function getClientNiveau(client, fid) {
  fid = fid || (getData().settings.fidelite || {});
  var pts = client.points || 0;
  if (pts >= (fid.seuilGold || 500)) return { nom: 'Gold', badge: 'badge-warn', icon: '🥇' };
  if (pts >= (fid.seuilSilver || 100)) return { nom: 'Silver', badge: 'badge-info', icon: '🥈' };
  return { nom: 'Bronze', badge: 'badge-recu', icon: '🥉' };
}

function renderClientList() {
  var d = getData();
  var q = (ge('clientSearch') ? ge('clientSearch').value : '').toLowerCase().trim();
  var list = d.clients.slice().sort(function (a, b) { return (b.totalCA || 0) - (a.totalCA || 0); });
  if (q) list = list.filter(function (c) {
    return ((c.prenom || '') + ' ' + (c.nom || '')).toLowerCase().includes(q) || (c.tel || '').includes(q);
  });
  var tb = ge('clientsBody'); if (!tb) return;
  if (!list.length) { tb.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--t3);padding:30px">Aucun client. Cliquez sur "+ Nouveau client".</td></tr>'; return; }
  tb.innerHTML = list.map(function (c) {
    var niv = getClientNiveau(c);
    var initiales = ((c.prenom || '?')[0] + (c.nom || '')[0]).toUpperCase();
    var nbTickets = d.tickets.filter(function (t) { return t.clientId === c.id; }).length;
    return '<tr>'
      + '<td><div style="display:flex;align-items:center;gap:8px"><div class="client-avatar">' + initiales + '</div><div><strong>' + escapeHtml(((c.prenom || '') + ' ' + (c.nom || '')).trim()) + '</strong>' + (c.note ? '<div style="font-size:.72rem;color:var(--t3)">' + escapeHtml(c.note) + '</div>' : '') + '</div></div></td>'
      + '<td>' + escapeHtml(c.tel || '—') + '</td>'
      + '<td class="num">' + nbTickets + '</td>'
      + '<td class="num"><strong>' + fmt(c.totalCA || 0) + '</strong></td>'
      + '<td class="num"><span style="color:var(--brand);font-weight:700">' + (c.points || 0) + '</span></td>'
      + '<td>' + (c.derniereVisite ? fmtDate(c.derniereVisite) : '<em>—</em>') + '</td>'
      + '<td><span class="badge ' + niv.badge + '">' + niv.icon + ' ' + niv.nom + '</span></td>'
      + '<td class="col-actions">'
      + '<button class="btn btn-sm" onclick="openClientModal(\'' + c.id + '\')">✏️</button> '
      + '<button class="btn btn-sm btn-danger" onclick="deleteClient(\'' + c.id + '\')">🗑</button>'
      + '</td></tr>';
  }).join('');
}

function renderFidelite() {
  var d = getData();
  var fid = d.settings.fidelite || {};
  var nbTotal = d.clients.length;
  var nbGold = d.clients.filter(function (c) { return (c.points || 0) >= (fid.seuilGold || 500); }).length;
  var ptsTotal = d.clients.reduce(function (s, c) { return s + (c.points || 0); }, 0);
  var caClients = d.clients.reduce(function (s, c) { return s + (c.totalCA || 0); }, 0);
  setTxt('fidKpiTotal', nbTotal);
  setTxt('fidKpiPoints', ptsTotal);
  setTxt('fidKpiVip', nbGold);
  setTxt('fidKpiCA', fmt(caClients));
  
  var top = d.clients.slice().sort(function (a, b) { return (b.points || 0) - (a.points || 0); }).slice(0, 20);
  var maxPts = Math.max(1, top[0] ? top[0].points : 1);
  var tb = ge('fideliteBody'); if (!tb) return;
  if (!top.length) { tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--t3);padding:24px">Aucun client.</td></tr>'; return; }
  tb.innerHTML = top.map(function (c, i) {
    var niv = getClientNiveau(c, fid);
    var pct = ((c.points || 0) / maxPts) * 100;
    var nbTickets = d.tickets.filter(function (t) { return t.clientId === c.id; }).length;
    return '<tr>'
      + '<td>' + (i + 1) + '</td>'
      + '<td><strong>' + escapeHtml(((c.prenom || '') + ' ' + (c.nom || '')).trim()) + '</strong></td>'
      + '<td class="num"><strong>' + (c.points || 0) + '</strong></td>'
      + '<td class="num">' + fmt(c.totalCA || 0) + '</td>'
      + '<td class="num">' + nbTickets + '</td>'
      + '<td><span class="badge ' + niv.badge + '">' + niv.icon + ' ' + niv.nom + '</span></td>'
      + '<td><div class="fidelite-bar"><div class="fidelite-fill" style="width:' + pct + '%"></div></div></td>'
      + '</tr>';
  }).join('');
}

function saveFideliteRules() {
  var d = getData();
  d.settings.fidelite = {
    euroParTranche: parseFloat(ge('fidRegleEuro').value) || 1,
    pointsParTranche: parseInt(ge('fidReglePoints').value) || 1,
    seuilSilver: parseInt(ge('fidRegleSilver').value) || 100,
    seuilGold: parseInt(ge('fidRegleGold').value) || 500
  };
  saveData(d);
  toast('⭐ Règles fidélité enregistrées', 'ok');
  renderFidelite();
}

var _editingClientId = null;
function openClientModal(id) {
  _editingClientId = id;
  var d = getData();
  var c = id ? d.clients.filter(function (x) { return x.id === id; })[0] : null;
  setTxt('modalClientTitle', c ? '✏️ Modifier client' : '👤 Nouveau client');
  ge('clientPrenom').value = c ? c.prenom || '' : '';
  ge('clientNom').value = c ? c.nom || '' : '';
  ge('clientTel').value = c ? c.tel || '' : '';
  ge('clientEmail').value = c ? c.email || '' : '';
  ge('clientNaissance').value = c ? c.naissance || '' : '';
  ge('clientPoints').value = c ? c.points || 0 : 0;
  ge('clientNote').value = c ? c.note || '' : '';
  ge('modalClient').classList.remove('hidden');
}

function saveClient() {
  var d = getData();
  var prenom = ge('clientPrenom').value.trim();
  var nom = ge('clientNom').value.trim();
  if (!prenom && !nom) { toast('Prénom ou nom obligatoire', 'err'); return; }
  var telSaisi = ge('clientTel').value.trim();
  if (telSaisi && telSuspect(telSaisi)) {
    toast('⚠️ Numéro incomplet : ' + telInternational(telSaisi) + ' — vérifiez avant d\'envoyer un WhatsApp', 'warn');
  }
  var c = {
    id: _editingClientId || uid(),
    prenom: prenom, nom: nom,
    tel: telSaisi,
    email: ge('clientEmail').value.trim(),
    naissance: ge('clientNaissance').value || null,
    points: parseInt(ge('clientPoints').value) || 0,
    note: ge('clientNote').value.trim()
  };
  if (_editingClientId) {
    var idx = d.clients.findIndex(function (x) { return x.id === _editingClientId; });
    if (idx >= 0) {
      var old = d.clients[idx];
      c.totalCA = old.totalCA || 0;
      c.derniereVisite = old.derniereVisite || null;
      d.clients[idx] = c;
    }
  } else {
    c.totalCA = 0;
    d.clients.push(c);
  }
  saveData(d);
  ge('modalClient').classList.add('hidden');
  toast('👤 Client enregistré', 'ok');
  renderClientList(); renderFidelite();
  // Si on était sur dépôt, refresh
  if (document.querySelector('#page-depot.active')) renderDepot();
}

function deleteClient(id) {
  showConfirm('Supprimer ce client ?', 'Action irréversible. Les tickets existants conservent le nom client.', function () {
    var d = getData();
    d.clients = d.clients.filter(function (c) { return c.id !== id; });
    saveData(d);
    toast('Client supprimé', 'ok');
    renderClientList(); renderFidelite();
  });
}

function exportClientsCSV() {
  var d = getData();
  var rows = [['Prenom', 'Nom', 'Tel', 'Email', 'Naissance', 'Points', 'CA total', 'Derniere visite', 'Niveau']];
  d.clients.forEach(function (c) {
    var n = getClientNiveau(c);
    rows.push([c.prenom || '', c.nom || '', c.tel || '', c.email || '', c.naissance || '', c.points || 0, c.totalCA || 0, c.derniereVisite ? fmtDate(c.derniereVisite) : '', n.nom]);
  });
  downloadCSV(rows, 'clients-pressing-' + today() + '.csv');
}

function downloadCSV(rows, filename) {
  var csv = rows.map(function (r) { return r.map(function (x) { return '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* ══ ABONNEMENTS / FORFAITS ════════════════════════════════════ */
function renderAbonnements() {
  renderAboCatalogue();
  renderAboActifs();
  bindAboEvents();
}

function bindAboEvents() {
  var bA = ge('btnAddForfait'); if (bA) bA.onclick = function () { openForfaitModal(null); };
  var bV = ge('btnVendreAbo'); if (bV) bV.onclick = openVendreAbo;
  // Type forfait change
  var fT = ge('forType');
  if (fT) fT.onchange = function () {
    ge('forValeurLabel').textContent = fT.value === 'quota' ? 'Nb articles inclus *' : 'Montant carte (€) *';
  };
}

function renderAboCatalogue() {
  var d = getData();
  var grid = ge('aboCatalogueGrid'); if (!grid) return;
  if (!d.forfaits || !d.forfaits.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--t3)">Aucun forfait. Cliquez sur "+ Nouveau forfait".</div>';
    return;
  }
  grid.innerHTML = d.forfaits.map(function (f) {
    var article = f.articleId ? d.articles.filter(function (a) { return a.id === f.articleId; })[0] : null;
    var valLabel = f.type === 'quota' ? f.valeur + ' articles' : fmt(f.valeur);
    return '<div class="abo-card">'
      + '<h4>🎁 ' + escapeHtml(f.nom) + '</h4>'
      + '<div style="display:flex;justify-content:space-between;margin:6px 0">'
      + '<span class="badge badge-brand">' + (f.type === 'quota' ? 'Quota' : 'Carte prépayée') + '</span>'
      + '<strong>' + fmt(f.prix) + '</strong></div>'
      + '<div style="font-size:.84rem;color:var(--t2);margin-bottom:5px">📦 ' + valLabel
      + (article ? ' · ' + escapeHtml(article.nom) : ' · Tout article')
      + '</div>'
      + '<div style="font-size:.78rem;color:var(--t3)">Validité : ' + (f.validite || 365) + ' jours</div>'
      + (f.desc ? '<div style="font-size:.78rem;color:var(--t2);margin-top:6px">' + escapeHtml(f.desc) + '</div>' : '')
      + '<div style="display:flex;gap:5px;margin-top:10px">'
      + '<button class="btn btn-sm" onclick="openForfaitModal(\'' + f.id + '\')">✏️</button>'
      + '<button class="btn btn-sm btn-danger" onclick="deleteForfait(\'' + f.id + '\')">🗑</button>'
      + '</div></div>';
  }).join('');
}

function renderAboActifs() {
  var d = getData();
  var grid = ge('aboActifsGrid'); if (!grid) return;
  var actifs = (d.abonnements || []).filter(function (a) {
    if (!a.dateExpiration) return true;
    return new Date(a.dateExpiration) >= new Date();
  });
  if (!actifs.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--t3)">Aucun abonnement actif. Vendez un forfait à un client !</div>';
    return;
  }
  grid.innerHTML = actifs.map(function (ab) {
    var c = d.clients.filter(function (x) { return x.id === ab.clientId; })[0];
    var f = (d.forfaits || []).filter(function (x) { return x.id === ab.forfaitId; })[0];
    if (!c || !f) return '';
    var nom = ((c.prenom || '') + ' ' + (c.nom || '')).trim();
    var jrsRest = ab.dateExpiration ? daysBetween(today(), ab.dateExpiration) : 999;
    var pctRest = f.type === 'quota' && f.valeur > 0 ? ((ab.soldeQuota || 0) / f.valeur) * 100 : 100;
    return '<div class="abo-card">'
      + '<h4>🎁 ' + escapeHtml(f.nom) + '</h4>'
      + '<div style="font-size:.86rem;color:var(--t1);margin-bottom:6px"><strong>👤 ' + escapeHtml(nom) + '</strong></div>'
      + '<div class="abo-progress">'
      + '<div class="abo-progress-num">' + (ab.soldeQuota || 0) + (f.type === 'quota' ? ' <span>/ ' + f.valeur + '</span>' : ' €') + '</div>'
      + '<div class="progress-bar"><div class="progress-fill ' + (pctRest > 50 ? 'ok' : (pctRest > 20 ? 'warn' : 'err')) + '" style="width:' + Math.max(5, pctRest) + '%"></div></div>'
      + '</div>'
      + '<div style="font-size:.74rem;color:var(--t3);margin-top:8px">Acheté le ' + fmtDate(ab.dateAchat) + (ab.dateExpiration ? ' · Expire dans ' + jrsRest + 'j' : '') + '</div>'
      + '<div style="display:flex;gap:5px;margin-top:8px"><button class="btn btn-sm btn-danger" onclick="deleteAbonnement(\'' + ab.id + '\')">🗑 Annuler</button></div>'
      + '</div>';
  }).filter(function(x){return x;}).join('');
}

var _editingForfaitId = null;
function openForfaitModal(id) {
  _editingForfaitId = id;
  var d = getData();
  var f = id ? (d.forfaits || []).filter(function (x) { return x.id === id; })[0] : null;
  setTxt('modalForfaitTitle', f ? '✏️ Modifier forfait' : '🎁 Nouveau forfait');
  ge('forNom').value = f ? f.nom : '';
  ge('forType').value = f ? f.type : 'quota';
  ge('forValeur').value = f ? f.valeur : '';
  ge('forPrix').value = f ? f.prix : '';
  ge('forValid').value = f ? f.validite || 365 : 365;
  ge('forDesc').value = f ? f.desc || '' : '';
  // Articles
  var sel = ge('forArticle');
  sel.innerHTML = '<option value="">Tout article</option>' + d.articles.map(function (a) { return '<option value="' + a.id + '">' + escapeHtml(a.nom) + '</option>'; }).join('');
  sel.value = f ? f.articleId || '' : '';
  // Label dynamique
  ge('forValeurLabel').textContent = ge('forType').value === 'quota' ? 'Nb articles inclus *' : 'Montant carte (€) *';
  ge('modalForfait').classList.remove('hidden');
}

function saveForfait() {
  var d = getData();
  if (!d.forfaits) d.forfaits = [];
  var nom = ge('forNom').value.trim();
  var valeur = parseFloat(ge('forValeur').value);
  var prix = parseFloat(ge('forPrix').value);
  if (!nom || isNaN(valeur) || valeur <= 0 || isNaN(prix) || prix < 0) { toast('Champs * obligatoires', 'err'); return; }
  var f = {
    id: _editingForfaitId || uid(),
    nom: nom,
    type: ge('forType').value,
    valeur: valeur,
    prix: prix,
    validite: parseInt(ge('forValid').value) || 365,
    articleId: ge('forArticle').value || null,
    desc: ge('forDesc').value.trim()
  };
  if (_editingForfaitId) {
    var idx = d.forfaits.findIndex(function (x) { return x.id === _editingForfaitId; });
    if (idx >= 0) d.forfaits[idx] = f;
  } else {
    d.forfaits.push(f);
  }
  saveData(d);
  ge('modalForfait').classList.add('hidden');
  toast('💾 Forfait enregistré', 'ok');
  renderAboCatalogue();
}

function deleteForfait(id) {
  showConfirm('Supprimer ce forfait ?', 'Les abonnements actifs basés dessus restent valides.', function () {
    var d = getData();
    d.forfaits = (d.forfaits || []).filter(function (f) { return f.id !== id; });
    saveData(d);
    toast('Supprimé', 'ok');
    renderAboCatalogue();
  });
}

function deleteAbonnement(id) {
  showConfirm('Annuler cet abonnement ?', 'Le client ne pourra plus l\'utiliser.', function () {
    var d = getData();
    d.abonnements = (d.abonnements || []).filter(function (a) { return a.id !== id; });
    saveData(d);
    toast('Annulé', 'ok');
    renderAboActifs();
  });
}

function openVendreAbo() {
  var d = getData();
  if (!d.clients.length) { toast('Créez un client d\'abord', 'warn'); return; }
  if (!(d.forfaits || []).length) { toast('Créez un forfait d\'abord', 'warn'); return; }
  var cs = ge('vAboClient');
  cs.innerHTML = d.clients.map(function (c) { return '<option value="' + c.id + '">' + escapeHtml(((c.prenom || '') + ' ' + (c.nom || '')).trim()) + (c.tel ? ' · ' + c.tel : '') + '</option>'; }).join('');
  var fs = ge('vAboForfait');
  fs.innerHTML = d.forfaits.map(function (f) { return '<option value="' + f.id + '">' + escapeHtml(f.nom) + ' — ' + fmt(f.prix) + '</option>'; }).join('');
  ge('vAboDate').value = today();
  fs.onchange = updateVAboInfo;
  updateVAboInfo();
  ge('modalVendreAbo').classList.remove('hidden');
}

function updateVAboInfo() {
  var d = getData();
  var fid = ge('vAboForfait').value;
  var f = (d.forfaits || []).filter(function (x) { return x.id === fid; })[0];
  if (!f) { ge('vAboInfo').innerHTML = ''; return; }
  ge('vAboInfo').innerHTML = '<strong>' + escapeHtml(f.nom) + '</strong><br>'
    + (f.type === 'quota' ? '📦 ' + f.valeur + ' articles inclus' : '💳 Carte prépayée ' + fmt(f.valeur))
    + '<br>⏱ Validité : ' + (f.validite || 365) + ' jours<br>'
    + '<strong>💰 Prix : ' + fmt(f.prix) + '</strong>';
}

function confirmVendreAbo() {
  var d = getData();
  if (!d.abonnements) d.abonnements = [];
  var cid = ge('vAboClient').value;
  var fid = ge('vAboForfait').value;
  if (!cid || !fid) { toast('Sélectionnez client et forfait', 'err'); return; }
  var f = (d.forfaits || []).filter(function (x) { return x.id === fid; })[0];
  var c = d.clients.filter(function (x) { return x.id === cid; })[0];
  if (!f || !c) return;
  
  var dateAchat = ge('vAboDate').value || today();
  var expirObj = new Date(dateAchat);
  expirObj.setDate(expirObj.getDate() + (f.validite || 365));
  
  var ab = {
    id: uid(),
    clientId: cid,
    clientNom: ((c.prenom || '') + ' ' + (c.nom || '')).trim(),
    forfaitId: fid,
    forfaitNom: f.nom,
    soldeQuota: f.valeur,
    valeurInitiale: f.valeur,
    dateAchat: dateAchat + 'T' + new Date().toTimeString().slice(0, 8),
    dateExpiration: expirObj.toISOString().slice(0, 10),
    paiement: ge('vAboPay').value,
    prixPaye: f.prix
  };
  d.abonnements.push(ab);
  
  // Fidélité
  var ci = d.clients.findIndex(function (x) { return x.id === cid; });
  if (ci >= 0) {
    var fid2 = d.settings.fidelite || {};
    var pts = Math.floor((f.prix / (fid2.euroParTranche || 1)) * (fid2.pointsParTranche || 1));
    d.clients[ci].points = (d.clients[ci].points || 0) + pts;
    d.clients[ci].totalCA = (d.clients[ci].totalCA || 0) + f.prix;
    d.clients[ci].visites = (d.clients[ci].visites || 0) + 1;
    d.clients[ci].derniereVisite = ab.dateAchat;
  }
  saveData(d);
  ge('modalVendreAbo').classList.add('hidden');
  toast('🎁 Forfait activé pour ' + escapeHtml(c.prenom || c.nom), 'ok');
  renderAboActifs();
}

/* ══ MARKETING / FIDÉLISATION ═══════════════════════════════════ */
function getClientNbTickets(d, clientId) {
  return d.tickets.filter(function (t) { return t.clientId === clientId; }).length;
}

function getClientsARisque(d) {
  var seuil = (d.settings.marketing || {}).seuilInactifJours || 45;
  return d.clients.filter(function (c) {
    var nbTickets = getClientNbTickets(d, c.id);
    if (nbTickets === 0 || !c.derniereVisite) return false; // pas encore un vrai client actif
    var jrs = daysBetween(c.derniereVisite, now());
    return jrs >= seuil;
  }).sort(function (a, b) { return new Date(a.derniereVisite || 0) - new Date(b.derniereVisite || 0); });
}

function getClientsFideles(d) {
  var fid = d.settings.fidelite || {};
  return d.clients.filter(function (c) { return (c.points || 0) >= (fid.seuilSilver || 100); })
    .sort(function (a, b) { return (b.points || 0) - (a.points || 0); });
}

function renderMarketing() {
  var d = getData();
  ge('mktSeuilInactif').value = (d.settings.marketing || {}).seuilInactifJours || 45;
  var fideles = getClientsFideles(d);
  var risque = getClientsARisque(d);
  setTxt('mktKpiFideles', fideles.length);
  setTxt('mktKpiRisque', risque.length);
  var offresMois = d.offres.filter(function (o) { return isThisMonth(o.date); });
  setTxt('mktKpiOffresMois', offresMois.length);
  var utilisees = d.offres.filter(function (o) { return o.statut === 'utilisee'; }).length;
  var taux = d.offres.length ? Math.round((utilisees / d.offres.length) * 100) : 0;
  setTxt('mktKpiTauxUtil', taux + '%');

  var nbAbosActifs = (d.abonnements || []).filter(function (a) { return a.statut !== 'termine'; }).length;
  setTxt('mktAboResume', 'Vous avez ' + (d.forfaits || []).length + ' forfait(s) au catalogue et ' + nbAbosActifs + ' abonnement(s) actif(s) actuellement.');
  ge('btnGoAbonnements').onclick = function () { navigateTo('abonnements'); };
  ge('btnSaveMktSettings').onclick = function () {
    var d2 = getData();
    d2.settings.marketing = { seuilInactifJours: parseInt(ge('mktSeuilInactif').value) || 45 };
    saveData(d2);
    toast('⚙️ Règle enregistrée', 'ok');
    renderMarketing();
  };

  var rb = ge('mktRisqueBody');
  if (!risque.length) { rb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--t3);padding:30px">Aucun client à risque pour le moment 🎉</td></tr>'; }
  else {
    rb.innerHTML = risque.map(function (c) {
      var jrs = c.derniereVisite ? daysBetween(c.derniereVisite, now()) : '—';
      return '<tr>'
        + '<td><strong>' + escapeHtml(((c.prenom || '') + ' ' + (c.nom || '')).trim()) + '</strong></td>'
        + '<td>' + escapeHtml(c.tel || '—') + '</td>'
        + '<td>' + (c.derniereVisite ? fmtDate(c.derniereVisite) : '<em>jamais revenu</em>') + '</td>'
        + '<td class="num"><span class="badge badge-warn">' + jrs + ' j</span></td>'
        + '<td class="num">' + fmt(c.totalCA || 0) + '</td>'
        + '<td class="col-actions"><button class="btn btn-sm btn-primary" onclick="openOffreModal(\'' + c.id + '\')">💌 Proposer une offre</button></td>'
        + '</tr>';
    }).join('');
  }

  var fb = ge('mktFidelesBody');
  if (!fideles.length) { fb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--t3);padding:30px">Aucun client fidèle (Silver/Gold) pour le moment.</td></tr>'; }
  else {
    fb.innerHTML = fideles.map(function (c) {
      var niv = getClientNiveau(c);
      return '<tr>'
        + '<td><strong>' + escapeHtml(((c.prenom || '') + ' ' + (c.nom || '')).trim()) + '</strong></td>'
        + '<td><span class="badge ' + niv.badge + '">' + niv.icon + ' ' + niv.nom + '</span></td>'
        + '<td class="num">' + (c.points || 0) + '</td>'
        + '<td class="num">' + fmt(c.totalCA || 0) + '</td>'
        + '<td>' + (c.derniereVisite ? fmtDate(c.derniereVisite) : '—') + '</td>'
        + '<td class="col-actions"><button class="btn btn-sm btn-primary" onclick="openOffreModal(\'' + c.id + '\')">🎁 Offre VIP</button></td>'
        + '</tr>';
    }).join('');
  }

  renderOffresList();
}

function renderOffresList() {
  var d = getData();
  var ob = ge('mktOffresBody');
  var list = d.offres.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  if (!list.length) { ob.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--t3);padding:30px">Aucune offre envoyée pour le moment.</td></tr>'; return; }
  var statutBadge = { envoyee: '<span class="badge badge-info">Envoyée</span>', utilisee: '<span class="badge badge-ok">Utilisée</span>', expiree: '<span class="badge badge-err">Expirée</span>' };
  ob.innerHTML = list.map(function (o) {
    return '<tr>'
      + '<td><strong>' + escapeHtml(o.clientNom || '—') + '</strong></td>'
      + '<td>' + escapeHtml(offreTypeLabel(o.type, o.valeur)) + '</td>'
      + '<td style="max-width:280px;font-size:.78rem;color:var(--t2)">' + escapeHtml((o.message || '').slice(0, 90)) + ((o.message || '').length > 90 ? '…' : '') + '</td>'
      + '<td>' + fmtDate(o.date) + '</td>'
      + '<td>' + (statutBadge[o.statut] || o.statut) + '</td>'
      + '<td class="col-actions">'
      + (o.statut === 'envoyee' ? '<button class="btn btn-sm" onclick="markOffreStatut(\'' + o.id + '\',\'utilisee\')">✅ Utilisée</button> <button class="btn btn-sm btn-danger" onclick="markOffreStatut(\'' + o.id + '\',\'expiree\')">⌛ Expirée</button>' : '')
      + '</td></tr>';
  }).join('');
}

function offreTypeLabel(type, valeur) {
  if (type === 'remise_pct') return '-' + (valeur || 0) + '% sur prochain dépôt';
  if (type === 'remise_abs') return '-' + fmt(valeur || 0) + ' sur prochain dépôt';
  if (type === 'points') return '+' + (valeur || 0) + ' points bonus';
  return 'Message personnalisé';
}

function markOffreStatut(id, statut) {
  var d = getData();
  var o = d.offres.filter(function (x) { return x.id === id; })[0];
  if (!o) return;
  o.statut = statut;
  saveData(d);
  renderMarketing();
  toast(statut === 'utilisee' ? '🎉 Offre marquée comme utilisée' : 'Offre marquée comme expirée', 'ok');
}

function openOffreModal(clientId) {
  var d = getData();
  var c = d.clients.filter(function (x) { return x.id === clientId; })[0];
  if (!c) return;
  ge('offreClientId').value = clientId;
  ge('offreType').value = 'remise_pct';
  ge('offreValeur').value = 10;
  updateOffreValeurUI();
  ge('offreMessage').value = buildOffreMessage(c, 'remise_pct', 10);
  ge('modalOffreTitle').textContent = '💌 Proposer une offre à ' + ((c.prenom || '') + ' ' + (c.nom || '')).trim();
  ge('modalOffre').classList.remove('hidden');
}

function updateOffreValeurUI() {
  var type = ge('offreType').value;
  var group = ge('offreValeurGroup');
  group.style.display = type === 'message' ? 'none' : '';
  ge('offreValeurLabel').textContent = type === 'remise_pct' ? 'Valeur (%)' : type === 'remise_abs' ? 'Valeur (' + getCur() + ')' : type === 'points' ? 'Points bonus' : 'Valeur';
}

function buildOffreMessage(c, type, valeur) {
  var d = getData();
  var nomPressing = d.settings.name || 'notre pressing';
  var prenom = c.prenom || c.nom || '';
  var base = 'Bonjour ' + prenom + ', ça faisait longtemps ! 😊 ' + nomPressing + ' vous propose ';
  if (type === 'remise_pct') base += 'une remise de ' + valeur + '% sur votre prochain dépôt.';
  else if (type === 'remise_abs') base += 'une remise de ' + fmt(valeur) + ' sur votre prochain dépôt.';
  else if (type === 'points') base += valeur + ' points bonus sur votre carte fidélité.';
  else base += 'une petite attention pour vous remercier de votre fidélité.';
  base += ' Au plaisir de vous revoir bientôt !';
  return base;
}

function saveOffre(envoyer) {
  var d = getData();
  var clientId = ge('offreClientId').value;
  var c = d.clients.filter(function (x) { return x.id === clientId; })[0];
  if (!c) { toast('Client introuvable', 'err'); return; }
  var type = ge('offreType').value;
  var valeur = parseFloat(ge('offreValeur').value) || 0;
  var message = ge('offreMessage').value.trim();
  if (!message) { toast('Le message ne peut pas être vide', 'err'); return; }
  var offre = {
    id: uid(), clientId: clientId, clientNom: ((c.prenom || '') + ' ' + (c.nom || '')).trim(),
    tel: c.tel || '', type: type, valeur: valeur, message: message, date: now(), statut: 'envoyee'
  };
  d.offres.push(offre);
  saveData(d);
  ge('modalOffre').classList.add('hidden');
  toast('💌 Offre enregistrée', 'ok');
  if (envoyer) {
    if (!c.tel) { toast('⚠️ Ce client n\'a pas de numéro de téléphone enregistré', 'warn'); }
    else {
      var telClean = waNumber(c.tel);
      if (!telClean) { toast('⚠️ Numéro de téléphone inutilisable', 'warn'); }
      else window.open('https://wa.me/' + telClean + '?text=' + encodeURIComponent(message), '_blank');
    }
  }
  renderMarketing();
}

/* ══ DÉPENSES ═══════════════════════════════════════════════════ */
var _editingStockId = null;
function renderStock() {
  var d = getData();
  if (!d.stock) d.stock = [];
  if (!d.stock.length && !d.settings.stockSeeded) {
    d.stock = seedStock(); d.settings.stockSeeded = true; saveData(d);
  }
  if (!d.settings.stockPricesSeeded) {
    var _chg = false;
    d.stock.forEach(function (x) { if (x.prixAchat == null && STOCK_PRICES[x.nom] != null) { x.prixAchat = STOCK_PRICES[x.nom]; _chg = true; } });
    d.settings.stockPricesSeeded = true;
    if (_chg) saveData(d);
  }
  var alerts = d.stock.filter(function (x) { return (x.qte || 0) <= (x.seuil || 0); });
  var ruptures = d.stock.filter(function (x) { return (x.qte || 0) <= 0; });
  setTxt('stockKpiTotal', d.stock.length);
  setTxt('stockKpiAlert', alerts.length);
  setTxt('stockKpiRupture', ruptures.length);
  var valTotale = d.stock.reduce(function (s2, x) { return s2 + (x.qte || 0) * (x.prixAchat || 0); }, 0);
  setTxt('stockKpiValeur', fmt(valTotale));
  var banner = ge('stockAlertBanner');
  if (banner) {
    if (alerts.length) {
      banner.classList.remove('hidden');
      banner.innerHTML = '\u26A0\uFE0F <strong>' + alerts.length + '</strong> article(s) \u00e0 r\u00e9approvisionner : ' + alerts.map(function (x) { return escapeHtml(x.nom) + ' (' + (x.qte || 0) + ')'; }).join(', ');
    } else banner.classList.add('hidden');
  }
  var cat = ge('stockFilterCat') ? ge('stockFilterCat').value : '';
  var list = d.stock.slice();
  if (cat) list = list.filter(function (x) { return x.categorie === cat; });
  var tb = ge('stockBody'); if (!tb) return;
  if (!list.length) { tb.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--t3);padding:24px">Aucun article. Cliquez sur \u00ab + Ajouter \u00bb.</td></tr>'; }
  else {
    tb.innerHTML = list.map(function (x) {
      var low = (x.qte || 0) <= (x.seuil || 0);
      var rupt = (x.qte || 0) <= 0;
      var stCls = rupt ? 'stock-rupt' : (low ? 'stock-low' : 'stock-ok');
      var stLbl = rupt ? '\u26D4 Rupture' : (low ? '\u26A0\uFE0F \u00c0 commander' : '\u2705 OK');
      return '<tr class="' + (low ? 'row-low' : '') + '">'
        + '<td><strong>' + escapeHtml(x.nom) + '</strong>' + (x.note ? '<div style="font-size:.72rem;color:var(--t3)">' + escapeHtml(x.note) + '</div>' : '') + '</td>'
        + '<td>' + escapeHtml(x.categorie || '\u2014') + '</td>'
        + '<td class="num"><button class="btn btn-sm" onclick="adjustStock(\'' + x.id + '\',-1)">\u2212</button> <strong style="min-width:30px;display:inline-block;text-align:center">' + (x.qte || 0) + '</strong> <button class="btn btn-sm" onclick="adjustStock(\'' + x.id + '\',1)">+</button></td>'
        + '<td>' + escapeHtml(x.unite || '') + '</td>'
        + '<td class="num">' + (x.prixAchat ? fmt(x.prixAchat) : '—') + '</td>'
        + '<td class="num">' + fmt((x.qte || 0) * (x.prixAchat || 0)) + '</td>'
        + '<td class="num">' + (x.seuil || 0) + '</td>'
        + '<td><span class="stock-badge ' + stCls + '">' + stLbl + '</span></td>'
        + '<td class="col-actions"><button class="btn btn-sm" onclick="openStockModal(\'' + x.id + '\')">\u270F\uFE0F</button> <button class="btn btn-sm btn-danger" onclick="deleteStock(\'' + x.id + '\')">🗑</button></td>'
        + '</tr>';
    }).join('');
  }
  if (ge('btnAddStock')) ge('btnAddStock').onclick = function () { openStockModal(null); };
  if (ge('stockFilterCat')) ge('stockFilterCat').onchange = renderStock;
}
function adjustStock(id, delta) {
  var d = getData();
  var x = (d.stock || []).find(function (i) { return i.id === id; });
  if (!x) return;
  x.qte = Math.max(0, (x.qte || 0) + delta);
  saveData(d); renderStock(); updateNotifs();
}
function openStockModal(id) {
  _editingStockId = id;
  var d = getData();
  var x = id ? (d.stock || []).find(function (i) { return i.id === id; }) : null;
  setTxt('modalStockTitle', x ? '\u270F\uFE0F Modifier l\'article' : '📦 Nouvel article de stock');
  ge('stkNom').value = x ? x.nom : '';
  ge('stkCat').value = x ? x.categorie : 'D\u00e9tergents & lessive';
  ge('stkUnite').value = x ? (x.unite || '') : 'unit\u00e9';
  ge('stkQte').value = x ? x.qte : '';
  ge('stkPrixAchat').value = x ? (x.prixAchat || '') : '';
  ge('stkSeuil').value = x ? x.seuil : '';
  ge('stkNote').value = x ? (x.note || '') : '';
  ge('modalStock').classList.remove('hidden');
}
function saveStock() {
  var d = getData();
  var nom = ge('stkNom').value.trim();
  if (!nom) { toast('Le nom est obligatoire', 'err'); return; }
  var x = { id: _editingStockId || uid(), nom: nom, categorie: ge('stkCat').value, unite: ge('stkUnite').value.trim(), qte: parseFloat(ge('stkQte').value) || 0, prixAchat: parseFloat(ge('stkPrixAchat').value) || 0, seuil: parseFloat(ge('stkSeuil').value) || 0, note: ge('stkNote').value.trim() };
  if (!d.stock) d.stock = [];
  if (_editingStockId) { var idx = d.stock.findIndex(function (i) { return i.id === _editingStockId; }); if (idx >= 0) d.stock[idx] = x; }
  else d.stock.push(x);
  saveData(d);
  ge('modalStock').classList.add('hidden');
  toast('💾 Stock enregistr\u00e9', 'ok');
  renderStock(); updateNotifs();
}
function deleteStock(id) {
  showConfirm('Supprimer cet article ?', 'Il sera retir\u00e9 du stock.', function () {
    var d = getData();
    d.stock = (d.stock || []).filter(function (i) { return i.id !== id; });
    saveData(d); renderStock(); updateNotifs();
  });
}
var CHARGES_TYPE = [
  { cat: 'Loyer', desc: 'Loyer mensuel', montant: 60000 },
  { cat: 'Salaires', desc: 'Salaires du personnel', montant: 475000 },
  { cat: 'Charges', desc: '\u00c9lectricit\u00e9', montant: 20000 },
  { cat: 'Charges', desc: 'Eau', montant: 17100 },
  { cat: 'Charges', desc: 'Imp\u00f4ts et taxes', montant: 18000 },
  { cat: 'Charges', desc: 'Connexion Internet', montant: 15000 },
  { cat: '\u00c9quipement', desc: 'Entretien des machines', montant: 30000 },
  { cat: 'Divers', desc: "Produits d'entretien (m\u00e9nage)", montant: 2000 }
];
function loadChargesMensuelles() {
  var d = getData();
  if (!d.depenses) d.depenses = [];
  var mois = today().slice(0, 7);
  var addAll = function () {
    CHARGES_TYPE.forEach(function (c) {
      d.depenses.push({ id: uid(), date: new Date().toISOString(), cat: c.cat, desc: c.desc, montant: c.montant, paiement: 'especes', note: 'Charge mensuelle' });
    });
    saveData(d);
    toast('\u2705 Charges du mois ajout\u00e9es', 'ok');
    renderDepenses();
  };
  var already = d.depenses.some(function (x) { return x.date && x.date.slice(0, 7) === mois && CHARGES_TYPE.some(function (c) { return c.desc === x.desc; }); });
  if (already) showConfirm('Charges d\u00e9j\u00e0 pr\u00e9sentes ce mois', 'Des charges fixes existent d\u00e9j\u00e0 pour ce mois-ci. Les ajouter quand m\u00eame ?', addAll);
  else addAll();
}
function renderDepenses() {
  var d = getData();
  var depMois = (d.depenses || []).filter(function (x) { return isThisMonth(x.date); });
  var totalMois = depMois.reduce(function (s, x) { return s + (x.montant || 0); }, 0);
  var totalAll = (d.depenses || []).reduce(function (s, x) { return s + (x.montant || 0); }, 0);
  
  // CA ce mois
  var caMois = 0;
  d.tickets.forEach(function (t) {
    (t.paiementsHist || []).forEach(function (p) {
      if (isThisMonth(p.date)) caMois += p.montant || 0;
    });
  });
  setTxt('depKpiMois', fmt(totalMois));
  setTxt('depKpiCA', fmt(caMois));
  setTxt('depKpiBenef', fmt(caMois - totalMois));
  setTxt('depKpiTotal', fmt(totalAll));
  
  var cat = ge('depFilterCat') ? ge('depFilterCat').value : '';
  var mois = ge('depFilterMois') ? ge('depFilterMois').value : '';
  var list = (d.depenses || []).slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  if (cat) list = list.filter(function (x) { return x.cat === cat; });
  if (mois) list = list.filter(function (x) { return x.date && x.date.slice(0, 7) === mois; });
  var tb = ge('depensesBody'); if (!tb) return;
  if (!list.length) { tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--t3);padding:24px">Aucune dépense.</td></tr>'; }
  else {
    tb.innerHTML = list.map(function (x) {
      var color = catColor(x.cat);
      return '<tr>'
        + '<td>' + fmtDate(x.date) + '</td>'
        + '<td><span class="dep-cat-badge" style="background:' + color.bg + ';color:' + color.fg + '">' + escapeHtml(x.cat) + '</span></td>'
        + '<td>' + escapeHtml(x.desc) + (x.note ? '<div style="font-size:.72rem;color:var(--t3)">' + escapeHtml(x.note) + '</div>' : '') + '</td>'
        + '<td class="num"><strong>' + fmt(x.montant) + '</strong></td>'
        + '<td>' + escapeHtml(x.paiement || '—') + '</td>'
        + '<td class="col-actions"><button class="btn btn-sm" onclick="openDepenseModal(\'' + x.id + '\')">✏️</button> <button class="btn btn-sm btn-danger" onclick="deleteDepense(\'' + x.id + '\')">🗑</button></td>'
        + '</tr>';
    }).join('');
  }
  ge('btnAddDepense').onclick = function () { openDepenseModal(null); };
  if (ge('btnLoadCharges')) ge('btnLoadCharges').onclick = loadChargesMensuelles;
  if (ge('depFilterCat')) ge('depFilterCat').onchange = renderDepenses;
  if (ge('depFilterMois')) ge('depFilterMois').onchange = renderDepenses;
  renderDepCharts(d);
}

function catColor(cat) {
  var map = {
    'Loyer': { bg: '#fee2e2', fg: '#991b1b' }, 'Salaires': { bg: '#dbeafe', fg: '#1e40af' },
    'Produits chimiques': { bg: '#dcfce7', fg: '#065f46' }, 'Charges': { bg: '#fef3c7', fg: '#92400e' },
    'Équipement': { bg: '#ede9fe', fg: '#5b21b6' }, 'Marketing': { bg: '#fce7f3', fg: '#9d174d' },
    'Divers': { bg: '#f1f5f9', fg: '#475569' }
  };
  return map[cat] || map['Divers'];
}

function renderDepCharts(d) {
  var byCat = {};
  (d.depenses || []).forEach(function (x) { byCat[x.cat] = (byCat[x.cat] || 0) + (x.montant || 0); });
  var ctx1 = ge('chartDepCat');
  if (ctx1 && typeof Chart !== 'undefined') {
    if (charts.depCat) charts.depCat.destroy();
    charts.depCat = new Chart(ctx1, {
      type: 'doughnut',
      data: { labels: Object.keys(byCat), datasets: [{ data: Object.values(byCat), backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'] }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
    });
  }
  var labels = []; var data = [];
  for (var i = 5; i >= 0; i--) {
    var dt = new Date(); dt.setMonth(dt.getMonth() - i);
    var ms = dt.toISOString().slice(0, 7);
    labels.push(dt.toLocaleDateString('fr-FR', { month: 'short' }));
    var t = (d.depenses || []).filter(function (x) { return x.date && x.date.slice(0, 7) === ms; }).reduce(function (s, x) { return s + (x.montant || 0); }, 0);
    data.push(t);
  }
  var ctx2 = ge('chartDepMois');
  if (ctx2 && typeof Chart !== 'undefined') {
    if (charts.depMois) charts.depMois.destroy();
    charts.depMois = new Chart(ctx2, {
      type: 'line',
      data: { labels: labels, datasets: [{ label: 'Dépenses', data: data, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.1)', tension: 0.3, fill: true }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }
}

var _editingDepId = null;
function openDepenseModal(id) {
  _editingDepId = id;
  var d = getData();
  var x = id ? (d.depenses || []).filter(function (i) { return i.id === id; })[0] : null;
  setTxt('modalDepenseTitle', x ? '✏️ Modifier dépense' : '💸 Nouvelle dépense');
  ge('depDate').value = x ? x.date.slice(0, 10) : today();
  ge('depCat').value = x ? x.cat : '';
  ge('depDesc').value = x ? x.desc : '';
  ge('depMontant').value = x ? x.montant : '';
  ge('depPaiement').value = x ? x.paiement || 'virement' : 'virement';
  ge('depNote').value = x ? x.note || '' : '';
  ge('modalDepense').classList.remove('hidden');
}

function saveDepense() {
  var d = getData();
  var date = ge('depDate').value;
  var cat = ge('depCat').value;
  var desc = ge('depDesc').value.trim();
  var montant = parseFloat(ge('depMontant').value) || 0;
  if (!date || !cat || !desc || montant <= 0) { toast('Tous les champs * sont obligatoires', 'err'); return; }
  var x = {
    id: _editingDepId || uid(),
    date: new Date(date).toISOString(),
    cat: cat, desc: desc, montant: montant,
    paiement: ge('depPaiement').value,
    note: ge('depNote').value.trim()
  };
  if (!d.depenses) d.depenses = [];
  if (_editingDepId) {
    var idx = d.depenses.findIndex(function (i) { return i.id === _editingDepId; });
    if (idx >= 0) d.depenses[idx] = x;
  } else {
    d.depenses.push(x);
  }
  saveData(d);
  ge('modalDepense').classList.add('hidden');
  toast('💾 Dépense enregistrée', 'ok');
  renderDepenses();
}

function deleteDepense(id) {
  showConfirm('Supprimer cette dépense ?', 'Action irréversible.', function () {
    var d = getData();
    d.depenses = (d.depenses || []).filter(function (x) { return x.id !== id; });
    saveData(d);
    toast('Supprimée', 'ok');
    renderDepenses();
  });
}

/* ══ ANALYSE ════════════════════════════════════════════════════ */
function renderAnalyse() {
  var d = getData();
  var period = parseInt(ge('analysePeriode').value) || 30;
  var since = new Date(); since.setDate(since.getDate() - period);
  
  // Tickets de la période (par date de dépôt)
  var tickets = d.tickets.filter(function (t) { return new Date(t.date) >= since && t.statut !== 'annule'; });
  
  // CA = paiements encaissés sur la période
  var caTot = 0;
  d.tickets.forEach(function (t) {
    (t.paiementsHist || []).forEach(function (p) {
      if (new Date(p.date) >= since) caTot += p.montant || 0;
    });
  });
  
  var nbArticles = tickets.reduce(function (s, t) { return s + (t.lignes || []).length; }, 0);
  setTxt('analyseKpiCA', fmt(caTot));
  setTxt('analyseKpiTx', tickets.length);
  setTxt('analyseKpiArt', nbArticles);
  setTxt('analyseKpiPanier', fmt(tickets.length ? caTot / tickets.length : 0));
  
  // Chart CA par jour (paiements)
  var byDay = {};
  d.tickets.forEach(function (t) {
    (t.paiementsHist || []).forEach(function (p) {
      if (new Date(p.date) < since) return;
      var k = p.date.slice(0, 10);
      byDay[k] = (byDay[k] || 0) + (p.montant || 0);
    });
  });
  var labels = Object.keys(byDay).sort();
  var data = labels.map(function (k) { return byDay[k]; });
  var ctx = ge('chartAnalyseCA');
  if (ctx && typeof Chart !== 'undefined') {
    if (charts.aCA) charts.aCA.destroy();
    charts.aCA = new Chart(ctx, {
      type: 'line',
      data: { labels: labels.map(function (l) { return new Date(l).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }), datasets: [{ label: 'CA TTC', data: data, borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,.15)', tension: 0.3, fill: true }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }
  
  // Top articles
  var top = {};
  tickets.forEach(function (t) {
    (t.lignes || []).forEach(function (l) {
      if (!top[l.articleNom]) top[l.articleNom] = { qte: 0, ca: 0 };
      top[l.articleNom].qte += l.qte || 1;
      top[l.articleNom].ca += l.prix * (l.qte || 1);
    });
  });
  var topArr = Object.entries(top).sort(function (a, b) { return b[1].qte - a[1].qte; }).slice(0, 10);
  var ctx2 = ge('chartAnalyseTop');
  if (ctx2 && typeof Chart !== 'undefined') {
    if (charts.aTop) charts.aTop.destroy();
    charts.aTop = new Chart(ctx2, {
      type: 'bar',
      data: { labels: topArr.map(function (x) { return x[0]; }), datasets: [{ label: 'Quantité', data: topArr.map(function (x) { return x[1].qte; }), backgroundColor: 'rgba(14,165,233,.6)' }] },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
    });
  }
  
  // Traitements
  var byTrait = {};
  tickets.forEach(function (t) {
    (t.lignes || []).forEach(function (l) {
      var k = l.traitementNom || 'Autre';
      byTrait[k] = (byTrait[k] || 0) + (l.qte || 1);
    });
  });
  var ctx3 = ge('chartAnalyseTraitement');
  if (ctx3 && typeof Chart !== 'undefined') {
    if (charts.aTrait) charts.aTrait.destroy();
    charts.aTrait = new Chart(ctx3, {
      type: 'doughnut',
      data: { labels: Object.keys(byTrait), datasets: [{ data: Object.values(byTrait), backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#3b82f6'] }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
    });
  }
  
  // Paiements
  var byPay = {};
  d.tickets.forEach(function (t) {
    (t.paiementsHist || []).forEach(function (p) {
      if (new Date(p.date) < since) return;
      byPay[p.mode || 'autre'] = (byPay[p.mode || 'autre'] || 0) + (p.montant || 0);
    });
  });
  var ctx4 = ge('chartAnalysePay');
  if (ctx4 && typeof Chart !== 'undefined') {
    if (charts.aPay) charts.aPay.destroy();
    charts.aPay = new Chart(ctx4, {
      type: 'doughnut',
      data: { labels: Object.keys(byPay), datasets: [{ data: Object.values(byPay), backgroundColor: ['#10b981', '#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6'] }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }
  
  // Heures dépôt
  var byHour = {};
  for (var h = 0; h < 24; h++) byHour[h] = 0;
  tickets.forEach(function (t) {
    try { var h = new Date(t.date).getHours(); byHour[h] += 1; } catch (e) { }
  });
  var ctx5 = ge('chartAnalyseHeure');
  if (ctx5 && typeof Chart !== 'undefined') {
    if (charts.aHeure) charts.aHeure.destroy();
    charts.aHeure = new Chart(ctx5, {
      type: 'bar',
      data: { labels: Object.keys(byHour).map(function (h) { return h + 'h'; }), datasets: [{ label: 'Dépôts', data: Object.values(byHour), backgroundColor: 'rgba(245,158,11,.6)' }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }
  
  // Tickets oubliés par mois
  var byMonth = {};
  for (var i = 5; i >= 0; i--) {
    var dt = new Date(); dt.setMonth(dt.getMonth() - i);
    byMonth[dt.toISOString().slice(0, 7)] = 0;
  }
  d.tickets.forEach(function (t) {
    if (t.statut !== 'pret') return;
    if (!t.dateChangementStatut) return;
    if (daysBetween(t.dateChangementStatut, now()) < 30) return;
    var m = t.date.slice(0, 7);
    if (byMonth[m] !== undefined) byMonth[m]++;
  });
  var ctx6 = ge('chartAnalyseOublies');
  if (ctx6 && typeof Chart !== 'undefined') {
    if (charts.aOublies) charts.aOublies.destroy();
    charts.aOublies = new Chart(ctx6, {
      type: 'bar',
      data: {
        labels: Object.keys(byMonth).map(function (m) { return new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short' }); }),
        datasets: [{ label: 'Tickets oubliés', data: Object.values(byMonth), backgroundColor: 'rgba(239,68,68,.6)' }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }
  
  ge('btnAnalyseRefresh').onclick = renderAnalyse;
  ge('analysePeriode').onchange = renderAnalyse;
}

/* ══ OBJECTIFS ══════════════════════════════════════════════════ */
function renderObjectifs() {
  var d = getData();
  var obj = d.objectifs || {};
  ge('objCaTTC').value = obj.caTTC || 8000;
  ge('objBenefice').value = obj.benefice || 2500;
  ge('objTickets').value = obj.tickets || 200;
  ge('objClients').value = obj.clients || 40;
  
  var ticketsMois = d.tickets.filter(function (t) { return isThisMonth(t.date) && t.statut !== 'annule'; });
  var caMois = 0;
  d.tickets.forEach(function (t) {
    (t.paiementsHist || []).forEach(function (p) { if (isThisMonth(p.date)) caMois += p.montant || 0; });
  });
  var depMois = (d.depenses || []).filter(function (x) { return isThisMonth(x.date); }).reduce(function (s, x) { return s + (x.montant || 0); }, 0);
  var benef = caMois - depMois;
  var nbCmd = ticketsMois.length;
  var fid = d.settings.fidelite || {};
  var nbClientFidele = d.clients.filter(function (c) { return (c.points || 0) >= (fid.seuilSilver || 100); }).length;
  
  function row(label, real, target, fmtFn) {
    var pct = target > 0 ? Math.min(100, (real / target) * 100) : 0;
    var cls = pct < 33 ? 'low' : (pct < 66 ? 'mid' : 'high');
    var st = pct >= 100 ? '<span class="obj-status atteint">✅ Atteint</span>' : (pct >= 33 ? '<span class="obj-status encours">🚧 En cours</span>' : '<span class="obj-status debut">▶️ Début</span>');
    return '<tr><td>' + label + '</td><td>' + fmtFn(target) + '</td><td class="obj-realise">' + fmtFn(real) + '</td><td class="obj-restant">' + fmtFn(Math.max(0, target - real)) + '</td><td class="obj-pct ' + cls + '">' + Math.round(pct) + '%</td><td>' + st + '</td></tr>';
  }
  ge('objProgressBody').innerHTML =
    row('💰 CA TTC', caMois, obj.caTTC || 0, fmt)
    + row('💎 Bénéfice net', benef, obj.benefice || 0, fmt)
    + row('🧾 Tickets', nbCmd, obj.tickets || 0, function (v) { return v + ''; })
    + row('⭐ Clients fidèles', nbClientFidele, obj.clients || 0, function (v) { return v + ''; });
  
  function gauge(label, real, target, fmtFn) {
    var pct = target > 0 ? Math.min(100, (real / target) * 100) : 0;
    var cls = pct < 33 ? 'low' : (pct < 66 ? 'mid' : 'high');
    return '<div class="obj-gauge-row"><div class="obj-gauge-label">' + label + '</div><div class="obj-gauge-bar"><div class="obj-gauge-fill ' + cls + '" style="width:' + pct + '%">' + Math.round(pct) + '%</div></div><div style="min-width:120px;text-align:right;font-size:.78rem">' + fmtFn(real) + ' / ' + fmtFn(target) + '</div></div>';
  }
  ge('objGauges').innerHTML =
    gauge('💰 CA TTC', caMois, obj.caTTC || 0, fmt)
    + gauge('💎 Bénéfice', benef, obj.benefice || 0, fmt)
    + gauge('🧾 Tickets', nbCmd, obj.tickets || 0, function (v) { return v + ''; })
    + gauge('⭐ Clients', nbClientFidele, obj.clients || 0, function (v) { return v + ''; });
  
  // Mensuel
  var rowEl = ge('objMonthlyRow');
  var monthsCA = []; var year = new Date().getFullYear();
  for (var m = 0; m < 12; m++) {
    var ms = year + '-' + (m + 1 + '').padStart(2, '0');
    var caM = 0;
    d.tickets.forEach(function (t) {
      (t.paiementsHist || []).forEach(function (p) {
        if (p.date && p.date.slice(0, 7) === ms) caM += p.montant || 0;
      });
    });
    monthsCA.push(caM);
  }
  rowEl.innerHTML = monthsCA.map(function (c) { return '<td>' + (c > 0 ? fmtN(c) : '—') + '</td>'; }).join('');
  
  var ctx = ge('chartObjMensuel');
  if (ctx && typeof Chart !== 'undefined') {
    if (charts.objMois) charts.objMois.destroy();
    charts.objMois = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sep.', 'Oct.', 'Nov.', 'Déc.'],
        datasets: [
          { label: 'CA TTC réalisé', data: monthsCA, backgroundColor: 'rgba(14,165,233,.7)' },
          { label: 'Objectif', data: monthsCA.map(function () { return obj.caTTC || 0; }), type: 'line', borderColor: '#ef4444', borderDash: [5, 5], fill: false }
        ]
      },
      options: { responsive: true }
    });
  }
  ge('btnSaveObjectifs').onclick = function () {
    var d2 = getData();
    d2.objectifs = {
      caTTC: parseFloat(ge('objCaTTC').value) || 0,
      benefice: parseFloat(ge('objBenefice').value) || 0,
      tickets: parseInt(ge('objTickets').value) || 0,
      clients: parseInt(ge('objClients').value) || 0
    };
    saveData(d2);
    toast('🎯 Objectifs enregistrés', 'ok');
    renderObjectifs();
  };
}

/* ══ PARAMÈTRES ═════════════════════════════════════════════════ */
function renderParametres() {
  try { renderEmplacementsSettings(); } catch (e) { console.error(e); }
  var d = getData();
  var s = d.settings;
  ge('setNom').value = s.name || '';
  ge('setTel').value = s.tel || '';
  ge('setAdresse').value = s.adresse || '';
  ge('setDevise').value = s.devise || '€';
  if (ge('setIndicatif')) ge('setIndicatif').value = s.indicatif || '225';
  ge('setTva').value = (s.tva == null ? 20 : s.tva);
  ge('setDelai').value = s.delaiStandard || 2;
  ge('setSlogan').value = s.slogan || '';
  // Logo
  var prev = ge('logoPreview');
  if (s.logo) {
    prev.innerHTML = '<img src="' + s.logo + '" alt="logo">';
    ge('btnRemoveLogo').style.display = '';
  } else {
    prev.innerHTML = '<span>Aucun logo</span>';
    ge('btnRemoveLogo').style.display = 'none';
  }
  // Compte SaaS (remplace l'ancienne licence hors-ligne)
  var acc = window.PPSync ? PPSync.getAccount() : null;
  if (ge('licInfoBox')) {
    if (acc && acc.email) {
      ge('licInfoBox').innerHTML = '✅ Compte actif<br><span style="font-family:monospace;font-size:.78rem">' + escapeHtml(acc.email) + '</span><br><span style="font-size:.72rem;color:var(--t2)">Abonnement : ' + escapeHtml(acc.plan || 'actif') + '</span>';
    } else {
      ge('licInfoBox').innerHTML = '<span style="color:var(--err)">Aucun compte détecté</span>';
    }
  }
  ge('formCommerce').onsubmit = function (e) {
    e.preventDefault();
    var d2 = getData();
    d2.settings.name = ge('setNom').value.trim() || 'Mon Pressing';
    d2.settings.tel = ge('setTel').value.trim();
    d2.settings.adresse = ge('setAdresse').value.trim();
    d2.settings.devise = ge('setDevise').value;
    if (ge('setIndicatif')) d2.settings.indicatif = ge('setIndicatif').value;
    d2.settings.tva = numVal('setTva', 20);
    d2.settings.delaiStandard = parseInt(ge('setDelai').value) || 2;
    d2.settings.slogan = ge('setSlogan').value.trim();
    saveData(d2);
    setTxt('brandName', d2.settings.name);
    toast('💾 Paramètres sauvegardés', 'ok');
  };
  if (ge('pinAccountName')) setTxt('pinAccountName', currentUser ? currentUser.nom : '—');
  ge('formPin').onsubmit = function (e) {
    e.preventDefault();
    if (!currentUser) { toast('Aucun compte connecté', 'err'); return; }
    var d2 = getData();
    var idx = d2.employes.findIndex(function (emp) { return emp.id === currentUser.id; });
    if (idx === -1) { toast('Compte introuvable', 'err'); return; }
    var oldPin = ge('pinOld').value;
    var newPin = ge('pinNew').value;
    var conf = ge('pinConfirm').value;
    if (oldPin !== d2.employes[idx].pin) { toast('PIN actuel incorrect', 'err'); return; }
    if (newPin !== conf) { toast('Les nouveaux PIN ne correspondent pas', 'err'); return; }
    if (!/^\d{4}$/.test(newPin)) { toast('Le PIN doit faire 4 chiffres', 'err'); return; }
    d2.employes[idx].pin = newPin;
    saveData(d2);
    currentUser.pin = newPin;
    toast('🔐 PIN modifié', 'ok');
    ge('pinOld').value = ''; ge('pinNew').value = ''; ge('pinConfirm').value = '';
  };
  ge('btnUploadLogo').onclick = function () { ge('fileLogoInput').click(); };
  ge('fileLogoInput').onchange = function (e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var d2 = getData();
      d2.settings.logo = ev.target.result;
      saveData(d2);
      renderParametres();
      applyLogo();
      toast('📷 Logo enregistré', 'ok');
    };
    reader.readAsDataURL(file);
  };
  ge('btnRemoveLogo').onclick = function () {
    var d2 = getData();
    d2.settings.logo = '';
    saveData(d2);
    renderParametres();
    applyLogo();
  };
  ge('btnExportData').onclick = function () {
    var d2 = getData();
    var blob = new Blob([JSON.stringify(d2, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pressingpro-backup-' + today() + '.json';
    a.click();
    toast('📤 Sauvegarde téléchargée', 'ok');
  };
  ge('btnImportData').onclick = function () { ge('fileImportData').click(); };
  ge('fileImportData').onchange = function (e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var d2 = JSON.parse(ev.target.result);
        if (!d2.settings) throw new Error('Invalid');
        showConfirm('Importer ces données ?', 'Vos données actuelles seront REMPLACÉES.', function () {
          saveData(d2);
          toast('📥 Données importées', 'ok');
          setTimeout(function () { location.reload(); }, 800);
        });
      } catch (err) { toast('Fichier invalide', 'err'); }
    };
    reader.readAsText(file);
  };
  ge('btnLoadDemo').onclick = function () {
    showConfirm('🇪🇺 Charger la démonstration Europe ?',
      'Installe un pressing fictif en euros, avec TVA, clients et tickets d\'exemple. Vos données actuelles seront remplacées. Vos comptes employés sont conservés.',
      function () {
        loadDemoData();
        setTimeout(function () { location.reload(); }, 800);
      });
  };
  ge('btnResetData').onclick = function () {
    showConfirm('⚠️ Réinitialiser TOUTES les données ?', 'Tous vos tickets, clients, articles seront supprimés. Action irréversible.', function () {
      localStorage.removeItem(DS_KEY);
      sessionStorage.removeItem('prspro_user');
      toast('Données réinitialisées', 'ok');
      setTimeout(function () { location.reload(); }, 800);
    });
  };
  var brm = ge('btnLoadDemoAfrique');
  if (brm) brm.onclick = function () {
    showConfirm('🌍 Charger la démonstration Afrique ?',
      'Installe un pressing fictif en FCFA : catalogue avec variantes, casiers, stock, charges, clients et tickets d\'exemple. Vos données actuelles seront remplacées. Vos comptes employés sont conservés.',
      loadDemoAfrique);
  };
}

/* ══ EMPLOYÉS — CRUD & PERMISSIONS ═════════════════════════════ */
var PAGE_LABELS = {
  dashboard: '📊 Dashboard', depot: '📥 Nouveau dépôt', encours: '🧺 Tickets en cours', retrait: '📤 Retrait',
  historique: '📜 Historique', cloture: '🔒 Clôture Z', tarifs: '🏷️ Tarifs', retouches: '✂️ Retouches',
  abonnements: '🎟️ Abonnements', clients: '👥 Clients', marketing: '📣 Marketing', depenses: '💸 Dépenses', stock: '📦 Stock', analyse: '📈 Analyse',
  objectifs: '🎯 Objectifs', parametres: '⚙️ Paramètres', aide: '📖 Aide'
};

function renderEmployes() {
  var d = getData();
  var tb = ge('employesBody'); if (!tb) return;
  if (!d.employes.length) { tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--t3);padding:30px">Aucun employé. Cliquez sur "+ Nouvel employé".</td></tr>'; }
  else {
    tb.innerHTML = d.employes.map(function (emp) {
      var acces = emp.role === 'admin' ? '<span class="emp-role-tag">Tous les onglets</span>'
        : (emp.pages && emp.pages.length ? emp.pages.map(function (p) { return '<span class="emp-role-tag">' + (PAGE_LABELS[p] || p) + '</span>'; }).join('') : '<em style="color:var(--t3)">Aucun accès</em>');
      return '<tr>'
        + '<td><strong>' + escapeHtml(emp.nom) + '</strong></td>'
        + '<td><span class="badge ' + (emp.role === 'admin' ? 'badge-brand' : 'badge-info') + '">' + (emp.role === 'admin' ? 'Administrateur' : 'Employé') + '</span></td>'
        + '<td style="max-width:420px">' + acces + '</td>'
        + '<td class="col-actions">'
        + '<button class="btn btn-sm" onclick="openEmployeModal(\'' + emp.id + '\')">✏️</button> '
        + '<button class="btn btn-sm btn-danger" onclick="deleteEmploye(\'' + emp.id + '\')">🗑</button>'
        + '</td></tr>';
    }).join('');
  }
  ge('btnAddEmploye').onclick = function () { openEmployeModal(null); };
}

function openEmployeModal(id) {
  var d = getData();
  var emp = id ? d.employes.filter(function (e) { return e.id === id; })[0] : null;
  ge('modalEmployeTitle').textContent = emp ? '✏️ Modifier l\'employé' : '🧑‍💼 Nouvel employé';
  ge('modalEmploye').dataset.editId = id || '';
  ge('empNom').value = emp ? emp.nom : '';
  ge('empRole').value = emp ? emp.role : 'employe';
  ge('empPin').value = ''; ge('empPinConfirm').value = '';
  var grid = ge('empPagesGrid');
  grid.innerHTML = ALL_PAGES.map(function (p) {
    var checked = emp && emp.pages && emp.pages.indexOf(p) !== -1 ? 'checked' : '';
    return '<label class="emp-page-chk"><input type="checkbox" value="' + p + '" ' + checked + '>' + (PAGE_LABELS[p] || p) + '</label>';
  }).join('');
  toggleEmpRoleUI();
  ge('empRole').onchange = toggleEmpRoleUI;
  ge('modalEmploye').classList.remove('hidden');
}

function toggleEmpRoleUI() {
  var isAdmin = ge('empRole').value === 'admin';
  ge('empPagesSection').classList.toggle('hidden', isAdmin);
  ge('empAdminNotice').classList.toggle('hidden', !isAdmin);
}

function saveEmploye() {
  var d = getData();
  var id = ge('modalEmploye').dataset.editId;
  var nom = ge('empNom').value.trim();
  var role = ge('empRole').value;
  var pin = ge('empPin').value;
  var pinConfirm = ge('empPinConfirm').value;
  if (!nom) { toast('Le nom est obligatoire', 'err'); return; }
  var existing = id ? d.employes.filter(function (e) { return e.id === id; })[0] : null;
  if (pin || pinConfirm || !existing) {
    if (!/^\d{4}$/.test(pin)) { toast('Le PIN doit contenir 4 chiffres', 'err'); return; }
    if (pin !== pinConfirm) { toast('Les PIN ne correspondent pas', 'err'); return; }
  }
  var dup = d.employes.filter(function (e) { return e.id !== id && e.pin === (pin || (existing ? existing.pin : '')); })[0];
  if (dup) { toast('Ce code PIN est déjà utilisé par ' + dup.nom, 'err'); return; }
  var pages = role === 'admin' ? ALL_PAGES.slice() : Array.prototype.slice.call(document.querySelectorAll('#empPagesGrid input:checked')).map(function (c) { return c.value; });

  if (existing) {
    existing.nom = nom; existing.role = role; existing.pages = pages;
    if (pin) existing.pin = pin;
    if (currentUser && currentUser.id === existing.id) currentUser = existing;
  } else {
    // Empêche la création d'un 2e compte pendant l'onboarding : garde-fou trivial, id unique suffit
    d.employes.push({ id: uid(), nom: nom, pin: pin, role: role, pages: pages });
  }
  saveData(d);
  ge('modalEmploye').classList.add('hidden');
  toast('💾 Employé enregistré', 'ok');
  renderEmployes();
}

function deleteEmploye(id) {
  var d = getData();
  var emp = d.employes.filter(function (e) { return e.id === id; })[0];
  if (!emp) return;
  var nbAdmins = d.employes.filter(function (e) { return e.role === 'admin'; }).length;
  if (emp.role === 'admin' && nbAdmins <= 1) { toast('⛔ Impossible : il doit rester au moins 1 Administrateur', 'err'); return; }
  if (currentUser && currentUser.id === id) { toast('⛔ Vous ne pouvez pas supprimer votre propre compte connecté', 'err'); return; }
  showConfirm('Supprimer cet employé ?', 'L\'accès de "' + emp.nom + '" sera immédiatement révoqué.', function () {
    d.employes = d.employes.filter(function (e) { return e.id !== id; });
    saveData(d);
    renderEmployes();
    toast('🗑 Employé supprimé', 'ok');
  }, '🗑');
}

function applyLogo() {
  var d = getData();
  if (d.settings.logo) {
    ge('brandIcon').classList.add('hidden');
    ge('brandLogo').src = d.settings.logo;
    ge('brandLogo').classList.remove('hidden');
  } else {
    ge('brandIcon').classList.remove('hidden');
    ge('brandLogo').classList.add('hidden');
  }
}

/* ══ CONFIRM MODAL ══════════════════════════════════════════════ */
function showConfirm(title, msg, cb, icon) {
  setTxt('confirmTitle', title);
  setTxt('confirmMsg', msg || '');
  ge('confirmIcon').textContent = icon || '⚠️';
  ge('confirmModal').classList.remove('hidden');
  var yes = ge('confirmYes'); var no = ge('confirmNo');
  yes.onclick = function () { ge('confirmModal').classList.add('hidden'); cb(); };
  no.onclick = function () { ge('confirmModal').classList.add('hidden'); };
}

/* ══ DONNÉES DE DÉMO ════════════════════════════════════════════ */
function loadDemoAfrique() {
  var employesExistants = (getData().employes || []).slice();
  var d = defaultData();
  d.employes = employesExistants;   // on ne touche pas aux comptes déjà créés

  d.settings.name = 'Pressing Le Bel Éclat';
  d.settings.slogan = 'Propreté • Qualité • Soin';
  d.settings.adresse = 'Rue du Commerce, quartier Centre';
  d.settings.tel = '27 21 00 00 00';
  d.settings.devise = 'FCFA';
  d.settings.indicatif = '225';
  d.settings.tva = 0;
  d.settings.delaiStandard = 2;
  d.settings.expressMult = 2;
  d.settings.emplacementActif = true;
  d.settings.categories = ['Traditionnel & Bazin', 'Linge de maison', 'Vêtements', 'Chaussures & Sacs', 'Cérémonie', 'Divers'];
  d.objectifs = { caTTC: 1500000, benefice: 400000, tickets: 300, clients: 40 };

  d.traitements = seedTraitements();   // Laver et repasser (t1) / Repasser seulement (t2)

  /* Catalogue : chaque variante porte son PRIX COMPLET, pas un supplément. */
  var A = function (id, nom, emoji, cat, prix, variantes) {
    return { id: id, nom: nom, emoji: emoji, categorie: cat, prices: { t1: prix }, couleurs: variantes || [] };
  };
  var V = function (nom, prix) { return { nom: nom, prix: prix }; };
  d.articles = [
    A('r1', 'Draps', '🛏️', 'Linge de maison', 1000, [V('Blanc', 1000), V('Autres couleurs', 500)]),
    A('r2', 'Couette', '🛏️', 'Linge de maison', 1500, [V('Petit', 1500), V('Moyen', 2000), V('Grand', 3000)]),
    A('r3', 'Couverture', '🛌', 'Linge de maison', 1000, [V('Blanc', 1000), V('Autres couleurs', 500)]),
    A('r4', 'Serviette', '🧺', 'Linge de maison', 1000, [V('Blanc', 1000), V('Autres couleurs', 500)]),
    A('r5', 'Rideau traversé', '🪟', 'Linge de maison', 1000, [V('2 composants', 1000), V('3 composants', 1500)]),
    A('r6', 'Moquette', '🧶', 'Linge de maison', 1500, [V('Moyen', 1500), V('Grand', 3000)]),
    A('r7', 'Tapis de sol', '🧶', 'Linge de maison', 500, [V('Petit', 500), V('Grand', 1000)]),
    A('r8', 'Bazin', '🥻', 'Traditionnel & Bazin', 1000, [V('Blanc', 1000), V('Autres couleurs', 800)]),
    A('r9', 'Boubou', '👘', 'Traditionnel & Bazin', 800, [V('Complet', 800), V('Simple', 500)]),
    A('r10', 'Haut traditionnel', '👕', 'Traditionnel & Bazin', 500, [V('Camisole', 500), V('Pantalon', 500), V('Complet', 1000)]),
    A('r11', 'Dentelle', '🧵', 'Traditionnel & Bazin', 1000, [V('Blanc', 1000), V('Autres couleurs', 800)]),
    A('r12', 'Complet tunique', '🥻', 'Traditionnel & Bazin', 1000, [V('Blanc', 1000), V('Tissu couleur', 800)]),
    A('r13', 'Camisole traditionnelle', '👚', 'Traditionnel & Bazin', 500, []),
    A('r14', 'Jupe de pagne', '👗', 'Traditionnel & Bazin', 500, []),
    A('r15', 'Chemise', '👔', 'Vêtements', 500, []),
    A('r16', 'Pantalon', '👖', 'Vêtements', 500, []),
    A('r17', 'Costume', '🤵', 'Vêtements', 1500, [V('2 pièces', 1500), V('3 pièces', 2000)]),
    A('r18', 'Pull', '🧥', 'Vêtements', 500, [V('Lourd', 500), V('Léger', 300)]),
    A('r19', 'Salopette', '👖', 'Vêtements', 500, []),
    A('r20', 'Chaussure', '👞', 'Chaussures & Sacs', 1000, [V('Blanc', 1000), V('Autres couleurs', 500), V('Enfant', 500)]),
    A('r21', 'Sac', '👜', 'Chaussures & Sacs', 500, [V('À main', 500), V('De voyage', 1000), V('À dos', 500)]),
    A('r22', 'Robe de mariage', '👰', 'Cérémonie', 3000, [V('Petit', 3000), V('Moyen', 5000), V('Grand', 7000)]),
    A('r23', 'Nounours (doudou)', '🧸', 'Divers', 1000, [V('Petit', 1000), V('Moyen', 1500), V('Grand', 2000)])
  ];

  d.retouches = [
    { id: 'ret1', nom: 'Ourlet pantalon', emoji: '✂️', prix: 1000, duree: 3, desc: 'Simple, sans doublure' },
    { id: 'ret2', nom: 'Pose fermeture éclair', emoji: '🔧', prix: 2000, duree: 5, desc: 'Selon la taille' },
    { id: 'ret3', nom: 'Reprise couture', emoji: '🪡', prix: 500, duree: 2, desc: 'Petit accroc' }
  ];

  d.forfaits = [
    { id: 'fo1', nom: 'Carte 20 chemises', type: 'quota', valeur: 20, prix: 8000, validite: 365, articleId: 'r15', desc: 'Deux chemises offertes' },
    { id: 'fo2', nom: 'Carte prépayée 50 000', type: 'solde', valeur: 50000, prix: 45000, validite: 365, articleId: null, desc: '10 % de bonus' }
  ];

  /* Casiers : la suggestion d'un client devenue fonctionnalité. */
  d.emplacements = [
    { id: 'e1', code: 'A1', type: 'Casier', zone: 'Salle avant', capacite: 3, note: '' },
    { id: 'e2', code: 'A2', type: 'Casier', zone: 'Salle avant', capacite: 3, note: '' },
    { id: 'e3', code: 'A3', type: 'Casier', zone: 'Salle avant', capacite: 3, note: '' },
    { id: 'e4', code: 'B1', type: 'Étagère', zone: 'Salle arrière', capacite: 6, note: 'Linge plié uniquement' },
    { id: 'e5', code: 'B2', type: 'Étagère', zone: 'Salle arrière', capacite: 6, note: '' },
    { id: 'e6', code: 'P1', type: 'Portant', zone: 'Salle avant', capacite: 20, note: 'Costumes et robes sur cintre' },
    { id: 'e7', code: 'P2', type: 'Portant', zone: 'Salle arrière', capacite: 20, note: '' },
    { id: 'e8', code: 'C1', type: 'Bac', zone: 'Réserve', capacite: 4, note: 'Couettes et couvertures' }
  ];

  /* Clients : numéros ivoiriens à 10 chiffres, écrits de façons différentes
     exprès, pour montrer que le logiciel les remet tous au bon format. */
  d.clients = [
    { id: 'c1', prenom: 'Mariam', nom: 'DIALLO', tel: '0707070707', email: '', naissance: '1988-05-12', points: 14, totalCA: 14000, visites: 18, derniereVisite: dPlus(-2) + 'T10:00:00Z', note: 'Cliente fidèle, paie au retrait' },
    { id: 'c2', prenom: 'Koffi', nom: 'N\'GUESSAN', tel: '05 03 90 10 76', email: '', naissance: '1975-11-03', points: 32, totalCA: 32000, visites: 27, derniereVisite: dPlus(-1) + 'T15:30:00Z', note: 'Costumes uniquement' },
    { id: 'c3', prenom: 'Aya', nom: 'KOUAME', tel: '+225 01 02 03 04 05', email: 'aya@example.com', naissance: '1993-02-20', points: 6, totalCA: 6000, visites: 7, derniereVisite: dPlus(-6) + 'T09:00:00Z', note: '' },
    { id: 'c4', prenom: 'Ibrahim', nom: 'TRAORE', tel: '2707070808', email: '', naissance: '1969-08-30', points: 21, totalCA: 21000, visites: 15, derniereVisite: dPlus(-4) + 'T11:00:00Z', note: 'Hôtel — dépôts groupés' },
    { id: 'c5', prenom: 'Fatou', nom: 'BAMBA', tel: '0505050505', email: '', naissance: '1996-07-14', points: 3, totalCA: 3000, visites: 3, derniereVisite: dPlus(-18) + 'T14:00:00Z', note: '' },
    { id: 'c6', prenom: 'Serge', nom: 'ADJOBI', tel: '0101010101', email: '', naissance: '1984-01-09', points: 9, totalCA: 9000, visites: 11, derniereVisite: dPlus(-9) + 'T16:00:00Z', note: '' }
  ];

  /* Tickets : on couvre tous les cas que le gérant rencontrera. */
  var counters = {};
  function ticketDemo(joursAvant, statut, idxClient, lignesSpec, partPayee, emplacement) {
    var dt = new Date();
    dt.setDate(dt.getDate() - joursAvant);
    dt.setHours(8 + (joursAvant % 9), (joursAvant * 7) % 60, 0, 0);
    var cle = dt.toISOString().slice(0, 10);
    counters[cle] = (counters[cle] || 0) + 1;
    var yy = String(dt.getFullYear()).slice(-2);
    var mm = String(dt.getMonth() + 1).padStart(2, '0');
    var dd = String(dt.getDate()).padStart(2, '0');
    var numero = 'D' + yy + '-' + mm + dd + '-' + String(counters[cle]).padStart(3, '0');
    var c = idxClient >= 0 ? d.clients[idxClient] : null;

    var lignes = lignesSpec.map(function (sp, i) {
      var art = d.articles.filter(function (a) { return a.id === sp.aId; })[0];
      var tr = d.traitements.filter(function (t) { return t.id === (sp.tId || 't1'); })[0];
      var prix = sp.prix;
      if (prix == null) {
        if (sp.variante && art && art.couleurs) {
          var v = art.couleurs.filter(function (x) { return x.nom === sp.variante; })[0];
          if (v) prix = v.prix;
        }
        if (prix == null) prix = (art && art.prices && art.prices[sp.tId || 't1']) || 500;
      }
      return {
        id: uid(), type: 'article',
        articleId: sp.aId, articleNom: (art ? art.nom : 'Article') + (sp.variante ? ' (' + sp.variante + ')' : ''),
        emoji: art ? art.emoji : '👔',
        categorie: art ? art.categorie : '',
        traitementId: sp.tId || 't1', traitementNom: tr ? tr.nom : '',
        prix: prix, qte: 1, note: sp.note || '',
        tagId: numero + '-' + articleLetter(i)
      };
    });

    var ht = lignes.reduce(function (s, l) { return s + l.prix; }, 0);
    var ttc = ht;                       // TVA à 0 dans la démonstration
    var paye = Math.round(ttc * (partPayee || 0));
    var hist = paye > 0 ? [{ date: dt.toISOString(), montant: paye, mode: 'especes',
      label: partPayee < 1 ? 'Acompte au dépôt' : 'Réglé au dépôt' }] : [];
    var delai = new Date(dt); delai.setDate(delai.getDate() + 2);
    var chgmt = dt.toISOString();
    var livraison = null;
    if (statut === 'traitement') { var d1 = new Date(dt); d1.setHours(d1.getHours() + 4); chgmt = d1.toISOString(); }
    if (statut === 'pret') { var d2 = new Date(dt); d2.setDate(d2.getDate() + 1); chgmt = d2.toISOString(); }
    if (statut === 'livre') {
      var d3 = new Date(dt); d3.setDate(d3.getDate() + 2);
      livraison = d3.toISOString(); chgmt = livraison;
      if (paye < ttc) {
        hist.push({ date: livraison, montant: ttc - paye, mode: 'wave', label: 'Solde au retrait' });
        paye = ttc;
      }
    }
    return {
      id: uid(), numero: numero, date: dt.toISOString(),
      clientId: c ? c.id : null,
      clientNom: c ? ((c.prenom || '') + ' ' + (c.nom || '')).trim() : 'Passage',
      lignes: lignes,
      ht: ht, remise: 0, tva: 0, ttc: ttc,
      soldePrecedent: 0,
      paye: paye, paiement: 'especes', paiementsHist: hist,
      delaiRetrait: delai.toISOString().slice(0, 10),
      note: '',
      express: false, expressMult: 1,
      statut: statut,
      dateChangementStatut: chgmt,
      dateLivraison: livraison,
      emplacement: (statut === 'pret' && emplacement) ? emplacement : ''
    };
  }

  d.tickets = [
    // déposés aujourd'hui, pas encore traités
    ticketDemo(0, 'recu', 0, [{ aId: 'r15' }, { aId: 'r15' }, { aId: 'r16' }], 0),
    ticketDemo(0, 'recu', 2, [{ aId: 'r8', variante: 'Blanc' }, { aId: 'r9', variante: 'Complet' }], 0.5),
    // en cours de traitement
    ticketDemo(1, 'traitement', 1, [{ aId: 'r17', variante: '2 pièces' }], 1),
    ticketDemo(1, 'traitement', 3, [{ aId: 'r1', variante: 'Blanc', note: 'tache de café' }, { aId: 'r1', variante: 'Autres couleurs' }], 0),
    // prêts et rangés : le cœur de la démonstration
    ticketDemo(2, 'pret', 0, [{ aId: 'r2', variante: 'Moyen' }], 0.5, 'C1'),
    ticketDemo(2, 'pret', 4, [{ aId: 'r15' }, { aId: 'r15' }, { aId: 'r16' }], 0, 'A1'),
    ticketDemo(3, 'pret', 1, [{ aId: 'r17', variante: '3 pièces' }], 0, 'P1'),
    ticketDemo(3, 'pret', 5, [{ aId: 'r20', variante: 'Blanc' }], 1, 'A2'),
    ticketDemo(4, 'pret', 2, [{ aId: 'r11', variante: 'Blanc' }, { aId: 'r14' }], 0.5, 'B1'),
    // prêt mais PAS rangé : montre l'alerte de l'écran Rangement
    ticketDemo(2, 'pret', 3, [{ aId: 'r4', variante: 'Blanc' }, { aId: 'r4', variante: 'Blanc' }], 0),
    // oublié depuis plus de 30 jours, toujours dans son casier
    ticketDemo(38, 'pret', 5, [{ aId: 'r18', variante: 'Léger' }], 0, 'B2'),
    // déjà retirés
    ticketDemo(4, 'livre', 0, [{ aId: 'r15' }, { aId: 'r15' }], 0.5),
    ticketDemo(6, 'livre', 1, [{ aId: 'r16' }, { aId: 'r15' }], 1),
    ticketDemo(8, 'livre', 3, [{ aId: 'r3', variante: 'Blanc' }], 0),
    ticketDemo(11, 'livre', 2, [{ aId: 'r22', variante: 'Moyen' }], 1),
    ticketDemo(14, 'livre', 4, [{ aId: 'r21', variante: 'À main' }], 1)
  ];
  d.counters = { ticketsByDay: counters };

  d.abonnements = [
    { id: uid(), clientId: 'c2', clientNom: 'Koffi N\'GUESSAN', forfaitId: 'fo1', forfaitNom: 'Carte 20 chemises',
      soldeQuota: 12, valeurInitiale: 20, dateAchat: dPlus(-20) + 'T10:00:00Z', dateExpiration: dPlus(345),
      paiement: 'wave', prixPaye: 8000 }
  ];

  d.stock = seedStock();
  d.settings.stockSeeded = true;
  d.settings.stockPricesSeeded = true;

  d.depenses = [
    { id: uid(), date: dPlus(-5) + 'T09:00:00Z', cat: 'Loyer', desc: 'Loyer mensuel', montant: 60000, paiement: 'especes', note: 'Charge mensuelle' },
    { id: uid(), date: dPlus(-5) + 'T09:05:00Z', cat: 'Salaires', desc: 'Salaires du personnel', montant: 475000, paiement: 'especes', note: 'Charge mensuelle' },
    { id: uid(), date: dPlus(-4) + 'T10:00:00Z', cat: 'Charges', desc: 'Électricité', montant: 20000, paiement: 'especes', note: 'Charge mensuelle' },
    { id: uid(), date: dPlus(-4) + 'T10:05:00Z', cat: 'Charges', desc: 'Eau', montant: 17100, paiement: 'especes', note: 'Charge mensuelle' },
    { id: uid(), date: dPlus(-3) + 'T11:00:00Z', cat: 'Équipement', desc: 'Entretien des machines', montant: 30000, paiement: 'especes', note: '' },
    { id: uid(), date: dPlus(-2) + 'T15:00:00Z', cat: 'Divers', desc: 'Produits d\'entretien (ménage)', montant: 2000, paiement: 'especes', note: '' }
  ];

  saveData(d);
  applyLogo();
  setTxt('brandName', d.settings.name);
  toast('🌍 Démonstration Afrique installée — catalogue, casiers, clients et tickets', 'ok');
  navigateTo('dashboard');
}

function loadDemoData() {
  var existingEmployes = (getData().employes || []).slice();
  var d = defaultData();
  d.employes = existingEmployes; // conserve les comptes employés existants
  d.settings.name = 'Pressing Démo Centre';
  d.settings.tel = '06 12 34 56 78';
  d.settings.adresse = '12 rue du Commerce, Paris';
  d.settings.slogan = 'Du dépôt au retrait, sans rien oublier';
  d.settings.devise = '€';
  d.settings.indicatif = '33';
  d.settings.tva = 20;
  d.settings.emplacementActif = true;
  d.settings.categories = ['Vêtements homme', 'Vêtements femme', 'Linge maison', 'Cuir & spécial'];
  d.objectifs = { caTTC: 8000, benefice: 2500, tickets: 200, clients: 40 };
  d.emplacements = [
    { id: 'e1', code: 'A1', type: 'Casier', zone: 'Boutique', capacite: 3, note: '' },
    { id: 'e2', code: 'A2', type: 'Casier', zone: 'Boutique', capacite: 3, note: '' },
    { id: 'e3', code: 'A3', type: 'Casier', zone: 'Boutique', capacite: 3, note: '' },
    { id: 'e4', code: 'B1', type: 'Étagère', zone: 'Réserve', capacite: 6, note: 'Linge plié' },
    { id: 'e5', code: 'P1', type: 'Portant', zone: 'Boutique', capacite: 20, note: 'Costumes et manteaux' },
    { id: 'e6', code: 'P2', type: 'Portant', zone: 'Réserve', capacite: 20, note: '' }
  ];

  // Traitements : 2 services
  d.traitements = seedTraitements();

  // Articles avec prix
  d.articles = [
    { id: 'a1', nom: 'Chemise', emoji: '👔', categorie: 'Vêtements homme', prices: { t1: 2.50, t2: 1.80, t3: 1.50, t4: 4.00 } },
    { id: 'a2', nom: 'Costume 2 pièces', emoji: '🤵', categorie: 'Vêtements homme', prices: { t1: 12.00, t4: 16.00 } },
    { id: 'a3', nom: 'Veste', emoji: '🧥', categorie: 'Vêtements homme', prices: { t1: 7.50, t2: 5.50, t3: 4.00 } },
    { id: 'a4', nom: 'Pantalon', emoji: '👖', categorie: 'Vêtements homme', prices: { t1: 5.00, t2: 3.50, t3: 2.50, t4: 6.50 } },
    { id: 'a5', nom: 'Robe', emoji: '👗', categorie: 'Vêtements femme', prices: { t1: 8.00, t2: 5.50, t3: 3.50, t4: 11.00 } },
    { id: 'a6', nom: 'Jupe', emoji: '👗', categorie: 'Vêtements femme', prices: { t1: 4.50, t2: 3.00, t3: 2.00 } },
    { id: 'a7', nom: 'Manteau', emoji: '🧥', categorie: 'Vêtements femme', prices: { t1: 14.00, t4: 18.00 } },
    { id: 'a8', nom: 'Drap (1 pers.)', emoji: '🛏️', categorie: 'Linge maison', prices: { t2: 4.00, t3: 2.00 } },
    { id: 'a9', nom: 'Couette', emoji: '🛏️', categorie: 'Linge maison', prices: { t2: 12.00 } },
    { id: 'a10', nom: 'Rideaux (par m²)', emoji: '🪟', categorie: 'Linge maison', prices: { t1: 8.00 } },
    { id: 'a11', nom: 'Veste cuir', emoji: '🧥', categorie: 'Cuir & spécial', prices: { t1: 25.00, t4: 35.00 } },
    { id: 'a12', nom: 'Robe de mariée', emoji: '👰', categorie: 'Cuir & spécial', prices: { t1: 80.00, t4: 120.00 } }
  ];

  // Retouches
  d.retouches = [
    { id: 'r1', nom: 'Ourlet pantalon', emoji: '✂️', prix: 8.00, duree: 3, desc: 'Simple' },
    { id: 'r2', nom: 'Ourlet jupe', emoji: '✂️', prix: 7.00, duree: 3, desc: '' },
    { id: 'r3', nom: 'Pose fermeture éclair', emoji: '🔧', prix: 12.00, duree: 5, desc: 'Selon taille' },
    { id: 'r4', nom: 'Reprise couture', emoji: '🪡', prix: 5.00, duree: 2, desc: 'Petit accroc' },
    { id: 'r5', nom: 'Ajustement taille', emoji: '📏', prix: 15.00, duree: 5, desc: 'Cintrage' }
  ];

  // Forfaits
  d.forfaits = [
    { id: 'f1', nom: 'Forfait 10 chemises', type: 'quota', valeur: 10, prix: 22.00, validite: 365, articleId: 'a1', desc: 'Économisez 3€ vs prix unitaire' },
    { id: 'f2', nom: 'Carte 50€', type: 'solde', valeur: 50, prix: 45.00, validite: 365, articleId: null, desc: '10% de bonus' },
    { id: 'f3', nom: 'Forfait 5 costumes', type: 'quota', valeur: 5, prix: 55.00, validite: 365, articleId: 'a2', desc: 'Économisez 5€' }
  ];

  // Clients
  d.clients = [
    { id: 'c1', prenom: 'Marie', nom: 'Dupont', tel: '0601020304', email: 'marie@example.com', naissance: '1985-03-15', points: 320, totalCA: 320, visites: 18, derniereVisite: dPlus(-2) + 'T10:00:00Z', note: '' },
    { id: 'c2', prenom: 'Jean', nom: 'Martin', tel: '0612345678', email: 'jean@example.com', naissance: '1972-07-22', points: 580, totalCA: 580, visites: 32, derniereVisite: dPlus(-1) + 'T15:30:00Z', note: 'Client VIP' },
    { id: 'c3', prenom: 'Sophie', nom: 'Bernard', tel: '0623456789', email: 'sophie@example.com', naissance: '1990-11-08', points: 75, totalCA: 75, visites: 5, derniereVisite: dPlus(-10) + 'T09:00:00Z', note: '' },
    { id: 'c4', prenom: 'Karim', nom: 'Boukhari', tel: '0634567890', email: '', naissance: '1980-05-12', points: 145, totalCA: 145, visites: 9, derniereVisite: dPlus(-5) + 'T11:00:00Z', note: '' },
    { id: 'c5', prenom: 'Aïcha', nom: 'Diallo', tel: '0645678901', email: 'aicha@example.com', naissance: '1995-09-20', points: 42, totalCA: 42, visites: 3, derniereVisite: dPlus(-15) + 'T14:00:00Z', note: '' }
  ];

  // Tickets — variés statuts
  d.tickets = [];
  var counters = {};
  function makeTicket(daysAgo, statut, clientIdx, articles, paiePct) {
    var dt = new Date(); dt.setDate(dt.getDate() - daysAgo); dt.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));
    var key = dt.toISOString().slice(0, 10);
    counters[key] = (counters[key] || 0) + 1;
    var yy = String(dt.getFullYear()).slice(-2);
    var mm = String(dt.getMonth() + 1).padStart(2, '0');
    var dd = String(dt.getDate()).padStart(2, '0');
    var numero = 'D' + yy + '-' + mm + dd + '-' + String(counters[key]).padStart(3, '0');
    var c = clientIdx >= 0 ? d.clients[clientIdx] : null;
    var lignes = articles.map(function (specs, i) {
      var art = d.articles.filter(function (a) { return a.id === specs.aId; })[0];
      var trait = d.traitements.filter(function (t) { return t.id === specs.tId; })[0];
      var prix = art && art.prices && art.prices[specs.tId] ? art.prices[specs.tId] : 5;
      return {
        id: uid(), type: 'article',
        articleId: specs.aId, articleNom: art ? art.nom : 'Article',
        emoji: art ? art.emoji : '👔',
        categorie: art ? art.categorie : '',
        traitementId: specs.tId, traitementNom: trait ? trait.nom : '',
        prix: prix, qte: 1, note: specs.note || '',
        tagId: numero + '-' + articleLetter(i)
      };
    });
    var ht = lignes.reduce(function (s, l) { return s + l.prix; }, 0);
    var tva = ht * 0.20;
    var ttc = ht + tva;
    var paye = ttc * (paiePct || 0);
    var paiementsHist = paye > 0 ? [{ date: dt.toISOString(), montant: paye, mode: 'especes', label: paiePct < 1 ? 'Acompte au dépôt' : 'Paiement intégral au dépôt' }] : [];
    var delai = new Date(dt); delai.setDate(delai.getDate() + 2);
    var dateChgmt = dt.toISOString();
    var dateLivraison = null;
    if (statut === 'pret') { var dc = new Date(dt); dc.setDate(dc.getDate() + 1); dateChgmt = dc.toISOString(); }
    if (statut === 'livre') {
      var dl = new Date(dt); dl.setDate(dl.getDate() + 2);
      dateLivraison = dl.toISOString();
      dateChgmt = dateLivraison;
      // Solde au retrait
      if (paye < ttc) {
        var solde = ttc - paye;
        paiementsHist.push({ date: dl.toISOString(), montant: solde, mode: 'cb', label: 'Solde au retrait' });
        paye = ttc;
      }
    }
    return {
      id: uid(), numero: numero, date: dt.toISOString(),
      clientId: c ? c.id : null,
      clientNom: c ? ((c.prenom || '') + ' ' + (c.nom || '')).trim() : 'Passage',
      lignes: lignes,
      ht: ht, remise: 0, tva: tva, ttc: ttc,
      paye: paye, paiement: 'especes', paiementsHist: paiementsHist,
      delaiRetrait: delai.toISOString().slice(0, 10),
      note: '',
      statut: statut,
      dateChangementStatut: dateChgmt,
      dateLivraison: dateLivraison
    };
  }

  // 10 tickets variés
  d.tickets.push(makeTicket(0, 'recu', 0, [{ aId: 'a1', tId: 't1' }, { aId: 'a1', tId: 't1' }, { aId: 'a4', tId: 't1' }], 0));
  d.tickets.push(makeTicket(0, 'recu', 1, [{ aId: 'a3', tId: 't1' }, { aId: 'a4', tId: 't1', note: 'tâche graisse manche' }], 0.5));
  d.tickets.push(makeTicket(1, 'traitement', 2, [{ aId: 'a5', tId: 't1' }], 1));
  d.tickets.push(makeTicket(1, 'traitement', 3, [{ aId: 'a2', tId: 't1' }, { aId: 'a1', tId: 't1' }, { aId: 'a1', tId: 't1' }], 0));
  var _p1 = makeTicket(2, 'pret', 0, [{ aId: 'a8', tId: 't2' }, { aId: 'a8', tId: 't2' }], 0.5);
  _p1.emplacement = 'B1'; d.tickets.push(_p1);
  var _p2 = makeTicket(2, 'pret', 4, [{ aId: 'a6', tId: 't1' }, { aId: 'a5', tId: 't1' }], 0);
  _p2.emplacement = 'A1'; d.tickets.push(_p2);
  var _p3 = makeTicket(35, 'pret', 1, [{ aId: 'a3', tId: 't1' }], 0);   // oublié depuis plus de 30 jours
  _p3.emplacement = 'P1'; d.tickets.push(_p3);
  d.tickets.push(makeTicket(3, 'livre', 0, [{ aId: 'a1', tId: 't1' }, { aId: 'a1', tId: 't1' }], 0.5));
  d.tickets.push(makeTicket(5, 'livre', 1, [{ aId: 'a7', tId: 't1' }], 1));
  d.tickets.push(makeTicket(7, 'livre', 2, [{ aId: 'a2', tId: 't1' }, { aId: 'a4', tId: 't1' }], 0));

  // Counters par jour
  d.counters.ticketsByDay = counters;

  // Abonnement actif
  d.abonnements = [
    { id: uid(), clientId: 'c2', clientNom: 'Jean Martin', forfaitId: 'f1', forfaitNom: 'Forfait 10 chemises', soldeQuota: 6, valeurInitiale: 10, dateAchat: dPlus(-15) + 'T10:00:00Z', dateExpiration: dPlus(350), paiement: 'cb', prixPaye: 22 }
  ];

  // Dépenses
  d.depenses = [
    { id: uid(), date: dPlus(-5) + 'T10:00:00Z', cat: 'Loyer', desc: 'Loyer mensuel', montant: 1500, paiement: 'virement', note: '' },
    { id: uid(), date: dPlus(-12) + 'T09:00:00Z', cat: 'Produits chimiques', desc: 'Solvant nettoyage', montant: 320, paiement: 'virement', note: '' },
    { id: uid(), date: dPlus(-3) + 'T14:00:00Z', cat: 'Charges', desc: 'EDF / Eau', montant: 240, paiement: 'virement', note: '' },
    { id: uid(), date: dPlus(-8) + 'T11:00:00Z', cat: 'Salaires', desc: 'Couturier - mi-temps', montant: 800, paiement: 'virement', note: '' }
  ];

  saveData(d);
  applyLogo();
  toast('🇪🇺 Démonstration Europe installée', 'ok');
}
function dPlus(n) { var t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }

/* ══ INITIALISATION ═════════════════════════════════════════════ */
function initApp() {
  applyLogo();
  var d = getData();
  setTxt('brandName', d.settings.name || 'PressingPro');
  navigateTo('dashboard');
  updateNotifs();
}

/* ══ COMPTE SAAS (remplace l'ancienne clé de licence hors-ligne) ══ */
function showAccountGate() {
  ge('accountOverlay').classList.remove('hidden');

  var tabLogin = ge('ppTabLogin'), tabSignup = ge('ppTabSignup');
  var formLogin = ge('ppLoginForm'), formSignup = ge('ppSignupForm');
  function showTab(which) {
    tabLogin.classList.toggle('active', which === 'login');
    tabSignup.classList.toggle('active', which === 'signup');
    formLogin.classList.toggle('hidden', which !== 'login');
    formSignup.classList.toggle('hidden', which !== 'signup');
  }
  tabLogin.onclick = function () { showTab('login'); };
  tabSignup.onclick = function () { showTab('signup'); };

  formLogin.onsubmit = function (e) {
    e.preventDefault();
    var email = ge('ppLoginEmail').value.trim();
    var pass = ge('ppLoginPassword').value;
    ge('ppLoginErr').textContent = '';
    PPSync.login(email, pass).then(function () {
      ge('accountOverlay').classList.add('hidden');
      boot();
    }).catch(function (err) {
      ge('ppLoginErr').textContent = '❌ ' + err.message;
    });
  };

  formSignup.onsubmit = function (e) {
    e.preventDefault();
    var name = ge('ppSignupName').value.trim();
    var email = ge('ppSignupEmail').value.trim();
    var pass = ge('ppSignupPassword').value;
    ge('ppSignupErr').textContent = '';
    PPSync.signup(name, email, pass).then(function () {
      ge('accountOverlay').classList.add('hidden');
      ge('welcomeOverlay').classList.remove('hidden');
    }).catch(function (err) {
      ge('ppSignupErr').textContent = '❌ ' + err.message;
    });
  };
}

function boot() {
  if (!window.PPSync || !PPSync.isLoggedIn()) {
    showAccountGate();
    return;
  }
  PPSync.setSyncBadge('syncing');
  PPSync.pull().then(function (serverData) {
    if (serverData) localStorage.setItem(DS_KEY, JSON.stringify(serverData));
    PPSync.setSyncBadge('ok');
    if (!serverData) {
      ge('welcomeOverlay').classList.remove('hidden');
    } else {
      initApp();
      checkAccessGate();
    }
  }).catch(function () {
    // Serveur injoignable au démarrage : on retombe sur le cache local
    // s'il existe (l'app reste utilisable hors-ligne), sinon on bloque
    // sur l'écran de connexion.
    PPSync.setSyncBadge('offline');
    var raw = localStorage.getItem(DS_KEY);
    if (raw) {
      initApp();
      checkAccessGate();
    } else {
      showAccountGate();
      toast('Impossible de joindre le serveur pour le moment.', 'err');
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  // Import direct d'une sauvegarde JSON existante depuis l'écran de bienvenue
  // (pour les anciens clients hors-ligne qui migrent vers le SaaS).
  var linkImp = ge('linkImportExisting'), fileImp = ge('fileImportExisting');
  if (linkImp && fileImp) {
    linkImp.onclick = function (e) { e.preventDefault(); fileImp.click(); };
    fileImp.onchange = function (e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var d2 = JSON.parse(ev.target.result);
          if (!d2.settings) throw new Error('invalid');
          saveData(d2);
          ge('welcomeOverlay').classList.add('hidden');
          toast('📥 Vos données ont été importées et synchronisées', 'ok');
          initApp();
          checkAccessGate();
        } catch (err) {
          toast('Fichier de sauvegarde invalide', 'err');
        }
      };
      reader.readAsText(file);
    };
  }

  boot();

  qs('.nav-item').forEach(function (n) {
    n.onclick = function () { navigateTo(n.dataset.page); };
  });
  // Relance client (boutons)
  if (ge('relanceWa')) ge('relanceWa').onclick = function () { window.open('https://wa.me/' + waNumber(_relanceCtx.tel) + '?text=' + encodeURIComponent(ge('relanceMsg').value), '_blank'); };
  if (ge('relanceSms')) ge('relanceSms').onclick = function () { window.open('sms:' + telInternational(_relanceCtx.tel) + '?&body=' + encodeURIComponent(ge('relanceMsg').value), '_blank'); };
  if (ge('relanceMail')) ge('relanceMail').onclick = function () { window.open('mailto:' + _relanceCtx.email + '?subject=' + encodeURIComponent('Commande ' + _relanceCtx.numero + ' prête') + '&body=' + encodeURIComponent(ge('relanceMsg').value), '_blank'); };
  if (ge('relanceClose')) ge('relanceClose').onclick = function () { ge('modalRelance').classList.add('hidden'); };
  if (ge('relanceAutoChk')) ge('relanceAutoChk').onchange = function () { var d2 = getData(); d2.settings.relanceAuto = ge('relanceAutoChk').checked; saveData(d2); };
  ge('menuToggle').onclick = function () { ge('sidebar').classList.toggle('open'); };
  initDarkMode();
  initTabs();
  initSearch();
  ge('notifBell').onclick = function () { ge('notifPanel').classList.toggle('hidden'); };
  document.addEventListener('click', function (e) {
    if (!ge('notifBell').contains(e.target) && !ge('notifPanel').contains(e.target)) ge('notifPanel').classList.add('hidden');
  });
  // Modales close
  var mb = [
    ['btnCloseArticle', 'modalArticle'], ['btnCloseTraitement', 'modalTraitement'],
    ['btnCloseConfArt', 'modalConfigArticle'], ['btnCloseRetouche', 'modalRetouche'],
    ['btnCloseForfait', 'modalForfait'], ['btnCloseVendreAbo', 'modalVendreAbo'],
    ['btnCloseClient', 'modalClient'], ['btnCloseDepense', 'modalDepense'],
    ['btnCloseEmploye', 'modalEmploye'], ['btnCloseOffre', 'modalOffre'], ['btnCloseStock', 'modalStock'],
    ['btnCloseEmpForm', 'modalEmpForm'], ['btnEmpPasser', 'modalEmplacement']
  ];
  mb.forEach(function (b) { var el = ge(b[0]); if (el) el.onclick = function () { ge(b[1]).classList.add('hidden'); }; });
  // Save buttons
  var sb = [
    ['btnSaveArticle', saveArticle], ['btnSaveTraitement', saveTraitement],
    ['btnAddConfArt', addConfArtToDepot], ['btnSaveRetouche', saveRetouche],
    ['btnSaveForfait', saveForfait], ['btnConfirmVendreAbo', confirmVendreAbo],
    ['btnSaveClient', saveClient], ['btnSaveDepense', saveDepense],
    ['btnSaveEmplacement', saveEmplacement], ['btnEmpValider', validerEmplacementModal],
    ['btnAddEmplacement', function () { openEmplacementForm(null); }],
    ['btnGenererSerie', genererSerieEmplacements],
    ['btnSaveEmploye', saveEmploye], ['btnSaveStock', saveStock]
  ];
  sb.forEach(function (b) { var el = ge(b[0]); if (el) el.onclick = b[1]; });
  // Login gate (employés)
  ge('btnCreateAdmin').onclick = function () {
    var nom = ge('createAdminNom').value.trim();
    var pin = ge('createAdminPin').value;
    var conf = ge('createAdminPinConfirm').value;
    if (!nom) { toast('Votre nom est obligatoire', 'err'); return; }
    if (!/^\d{4}$/.test(pin)) { toast('Le PIN doit contenir 4 chiffres', 'err'); return; }
    if (pin !== conf) { toast('Les PIN ne correspondent pas', 'err'); return; }
    var d2 = getData();
    var admin = { id: uid(), nom: nom, pin: pin, role: 'admin', pages: ALL_PAGES.slice() };
    d2.employes.push(admin);
    saveData(d2);
    setCurrentUser(admin);
    toast('✅ Compte Administrateur créé', 'ok');
  };
  ge('btnLoginPinSubmit').onclick = attemptLogin;
  ge('loginPinInput').onkeydown = function (e) { if (e.key === 'Enter') attemptLogin(); };
  ge('btnLoginBack').onclick = showLoginGate;
  ge('btnSwitchUser').onclick = logoutUser;
  ge('offreType').onchange = function () {
    var d = getData();
    var c = d.clients.filter(function (x) { return x.id === ge('offreClientId').value; })[0];
    updateOffreValeurUI();
    if (c) ge('offreMessage').value = buildOffreMessage(c, ge('offreType').value, parseFloat(ge('offreValeur').value) || 0);
  };
  ge('btnSaveOffreOnly').onclick = function () { saveOffre(false); };
  ge('btnSendOffreWA').onclick = function () { saveOffre(true); };
  ['createAdminPin', 'createAdminPinConfirm'].forEach(function (id) {
    ge(id).onkeydown = function (e) { if (e.key === 'Enter') ge('btnCreateAdmin').click(); };
  });
  // ESC + Ctrl+Enter
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      qs('.modal').forEach(function (m) { m.classList.add('hidden'); });
    }
    if (e.ctrlKey && e.key === 'Enter') {
      var btnD = ge('btnValiderDepot');
      if (btnD && document.querySelector('#page-depot.active')) btnD.click();
    }
    if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      var s = ge('globalSearch'); if (s) s.focus();
    }
  });
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateNotifs, 30000);
});
