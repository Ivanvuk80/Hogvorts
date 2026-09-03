/* Распоред 5/4 — service worker (offline меморија + увек свеж распоред) */
var CACHE = 'raspored-54-v11';
var FAJLOVI = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(FAJLOVI); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* V9: STALE-WHILE-REVALIDATE — отварање је УВИЈЕК из кеша (маховито,
   и на слабом сигналу), а мрежа у ПОЗАДИНИ освежава кеш за сљедеће
   отварање. Промјена распореда стиже при сљедећем отварању (нпр. после
   школе) — размјена за то да апликација никад не виси на мрежи. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (izKesa) {
      var osvjezavanje = fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var kopija = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, kopija); });
        }
        return res;
      }).catch(function () { /* офлајн — кеш већ служен */ });
      return izKesa || osvjezavanje.catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
