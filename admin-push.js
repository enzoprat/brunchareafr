/* ============================================================
   BRUNCH AREA — Dashboard : notifications push + pastille
   ------------------------------------------------------------
   - Enregistre le service worker
   - Abonne l'appareil aux notifications push (bouton)
   - Remet la pastille de l'icône à zéro à l'ouverture
   ============================================================ */
(function () {
  var KEY = new URLSearchParams(location.search).get('key') || '';
  function q(path) {
    if (!KEY) return path;
    return path + (path.indexOf('?') < 0 ? '?' : '&') + 'key=' + encodeURIComponent(KEY);
  }

  var btn = document.getElementById('notifBtn');
  var supported = ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);

  function setBtn(text, disabled) {
    if (!btn) return;
    btn.style.display = '';
    btn.textContent = text;
    btn.disabled = !!disabled;
  }

  function urlB64ToUint8Array(base64) {
    var padding = '='.repeat((4 - base64.length % 4) % 4);
    var b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  // Remet la pastille à zéro (icône + serveur)
  function clearBadge() {
    if ('clearAppBadge' in navigator) { try { navigator.clearAppBadge(); } catch (e) {} }
    fetch(q('/api/push/seen'), { method: 'POST' }).catch(function () {});
  }

  async function subscribe(reg, vapidKey) {
    var sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidKey)
      });
    }
    await fetch(q('/api/push/subscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
  }

  var swReg = null, vapid = '';

  async function init() {
    if (!supported) { if (btn) btn.style.display = 'none'; return; }

    // Le serveur a-t-il les notifications activées ?
    try {
      var r = await fetch(q('/api/push/key'));
      var j = await r.json();
      if (!j.enabled || !j.key) { if (btn) btn.style.display = 'none'; return; }
      vapid = j.key;
    } catch (e) { if (btn) btn.style.display = 'none'; return; }

    swReg = await navigator.serviceWorker.register('/sw.js');

    if (Notification.permission === 'granted') {
      setBtn('🔔 Notifications actives', true);
      try { await subscribe(swReg, vapid); } catch (e) {}
      clearBadge();
    } else if (Notification.permission === 'denied') {
      setBtn('🔕 Notifications bloquées', true);
    } else {
      setBtn('🔔 Activer les notifications', false);
    }
  }

  window.enableNotifs = async function () {
    if (!supported || !swReg) return;
    setBtn('…', true);
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setBtn(perm === 'denied' ? '🔕 Notifications bloquées' : '🔔 Activer les notifications', perm === 'denied');
      return;
    }
    try {
      await subscribe(swReg, vapid);
      setBtn('🔔 Notifications actives', true);
      clearBadge();
    } catch (e) {
      setBtn('🔔 Réessayer', false);
    }
  };

  // Quand l'app revient au premier plan -> on efface la pastille
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && Notification.permission === 'granted') clearBadge();
  });

  init();
})();
