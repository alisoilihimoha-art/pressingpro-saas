/* ================================================================
   PressingPro SaaS — module de connexion au serveur (PPSync)
   ------------------------------------------------------------------
   Ce module NE remplace PAS le fonctionnement hors-ligne de l'app :
   toutes les lectures/écritures de script.js continuent de passer
   par localStorage exactement comme avant (getData()/saveData()).
   Il ajoute juste, par-dessus :
     - un vrai compte (inscription / connexion) à la place de la
       clé de licence locale ;
     - un aller-retour réseau discret qui garde le serveur à jour
       (et permet de retrouver ses données sur un autre appareil).
   Si le réseau est coupé, l'app continue de fonctionner sur le
   cache local et rattrape la synchronisation au retour du réseau.
   ================================================================ */
(function () {
  var TOKEN_KEY = 'pressingpro_token';
  var ACCOUNT_KEY = 'pressingpro_account';
  var API_BASE = window.PRESSINGPRO_API_URL || '';

  var PP = window.PPSync = {};

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  PP.getAccount = function () {
    try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY)); } catch (e) { return null; }
  };
  function setAccount(a) { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a)); }

  function api(path, method, body) {
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(API_BASE + path, {
      method: method || 'GET',
      headers: headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (json) {
        if (!r.ok) throw new Error(json.error || ('Erreur réseau (' + r.status + ')'));
        return json;
      });
    });
  }

  PP.isLoggedIn = function () { return !!getToken(); };

  PP.signup = function (businessName, email, password) {
    return api('/api/auth/signup', 'POST', { businessName: businessName, email: email, password: password })
      .then(function (res) {
        setToken(res.token);
        setAccount({ email: email, businessName: res.businessName, plan: 'trial' });
        return res;
      });
  };

  PP.login = function (email, password) {
    return api('/api/auth/login', 'POST', { email: email, password: password })
      .then(function (res) {
        setToken(res.token);
        setAccount({ email: email, businessName: res.businessName });
        return res;
      });
  };

  PP.logout = function () {
    clearToken();
    localStorage.removeItem(ACCOUNT_KEY);
    localStorage.removeItem('pressingpro_data_v1');
    location.reload();
  };

  // Récupère le blob de données du compte connecté.
  PP.pull = function () {
    return api('/api/data', 'GET').then(function (res) { return res.data; });
  };

  // Restaure une sauvegarde JSON exportée par l'ancienne version hors-ligne.
  PP.importBackup = function (data) {
    return api('/api/import', 'POST', { data: data });
  };

  // ── Synchronisation en arrière-plan (débouncée) ──────────────────
  var pendingPush = null, pushTimer = null, pushing = false;

  PP.schedulePush = function (data) {
    if (!PP.isLoggedIn()) return;
    pendingPush = data;
    setSyncBadge('pending');
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(flushPush, 1500);
  };

  function flushPush() {
    if (!PP.isLoggedIn() || pendingPush === null || pushing) return;
    pushing = true;
    var toSend = pendingPush;
    pendingPush = null;
    setSyncBadge('syncing');
    api('/api/data', 'PUT', { data: toSend })
      .then(function () {
        pushing = false;
        if (pendingPush !== null) { flushPush(); } else { setSyncBadge('ok'); }
      })
      .catch(function () {
        pushing = false;
        pendingPush = toSend; // on retentera plus tard
        setSyncBadge('offline');
      });
  }

  window.addEventListener('online', function () { if (pendingPush !== null) flushPush(); });
  window.addEventListener('offline', function () { setSyncBadge('offline'); });

  function setSyncBadge(state) {
    var el = document.getElementById('ppSyncBadge');
    if (!el) return;
    var map = {
      ok: ['☁️ Synchronisé', 'pp-sync-ok'],
      pending: ['☁️ Modifications en attente…', ''],
      syncing: ['☁️ Synchronisation…', ''],
      offline: ['⚠️ Hors-ligne — sera synchronisé au retour du réseau', 'pp-sync-err']
    };
    var v = map[state] || ['', ''];
    el.textContent = v[0];
    el.className = 'pp-sync-badge ' + v[1];
  }
  PP.setSyncBadge = setSyncBadge;
})();
