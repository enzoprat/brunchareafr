/* ============================================================
   BRUNCH AREA — Service worker (notifications push + pastille)
   ------------------------------------------------------------
   Reçoit les push envoyées par le serveur MÊME quand l'app est
   fermée : affiche la notification système et met à jour le
   chiffre sur l'icône (badge). Au clic -> ouvre le dashboard.
   ============================================================ */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = {}; }

  var title = data.title || 'Brunch Area';
  var body = data.body || 'Nouvelle activité';
  var badge = typeof data.badge === 'number' ? data.badge : 0;
  var url = data.url || '/admin';

  e.waitUntil((async function () {
    await self.registration.showNotification(title, {
      body: body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'brunch-activity',
      renotify: true,
      vibrate: [120, 60, 120],
      data: { url: url }
    });
    if (self.navigator && 'setAppBadge' in self.navigator) {
      try {
        if (badge > 0) await self.navigator.setAppBadge(badge);
        else await self.navigator.clearAppBadge();
      } catch (_) { /* badge non supporté : on ignore */ }
    }
  })());
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/admin';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf('/admin') > -1 && 'focus' in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
