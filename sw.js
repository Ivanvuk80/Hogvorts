/* Распоред 5/4 — service worker (offline меморија + увек свеж распоред)
   v17 — одељење у подешавањима + читљивији линкови у подножју. */
var CACHE = 'raspored-54-v17';
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
      var mrezno = fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var kopija = res.clone();
          // без query-ја — иначе ignoreSearch + put прави дупликате
          var kljuc = url.search ? new Request(url.origin + url.pathname, { credentials: e.request.credentials }) : e.request;
          caches.open(CACHE).then(function (c) { c.put(kljuc, kopija); });
        }
        return res;
      }).catch(function () {});

      e.waitUntil(mrezno);

      return izKesa || mrezno.catch(function () {
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
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
