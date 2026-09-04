/* Распоред 5/4 — service worker (offline меморија + увек свеж распоред)
   v15 — исправљен stale-while-revalidate: мрежа се сада стварно позива
   у позадини и кеш се ажурира. */
var CACHE = 'raspored-54-v15';
var FAJLOVI = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(FAJLOVI); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (izKesa) {
      // Увек покрени мрежни захтев у позадини
      var mrezno = fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var kopija = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, kopija); });
        }
        return res;
      }).catch(function () {
        // мрежа није доступна – кеш је већ враћен
      });

      // Држи SW жив док се кеш не ажурира
      e.waitUntil(mrezno);

      // Врати кеш ако постоји; ако не, врати мрежни одговор
      return izKesa || mrezno.catch(function () {
        // Ако је навигација, врати index.html (offline fallback)
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        // За остале ресурсе врати празан одговор
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
