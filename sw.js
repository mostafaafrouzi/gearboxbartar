/* PWA: همیشه index از شبکه (به‌روز)، فقط فونت/آیکن برای آفلاین */
const CACHE_NAME = 'gearboxbartar-static-v6';
const INDEX_URL = new URL('index.html', self.location).toString();

const STATIC_ASSETS = [
  'manifest.webmanifest',
  'assets/fonts/iransansx/fonts.css',
  'assets/fonts/iransansx/woff2/IRANSansX-Regular.woff2',
  'assets/fonts/iransansx/woff2/IRANSansX-Bold.woff2',
  'icons/favicon.png',
  'icons/logo-top.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
].map(function (p) { return new URL(p, self.location).toString(); });

function isDocumentRequest(request) {
  if (request.mode === 'navigate') return true;
  try {
    var url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    return url.pathname.endsWith('/index.html') || url.pathname.endsWith('/gearboxbartar') || url.pathname.endsWith('/gearboxbartar/');
  } catch (e) {
    return false;
  }
}

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.allSettled(
        STATIC_ASSETS.map(function (url) {
          return cache.add(url).catch(function () {});
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  if (isDocumentRequest(request)) {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(INDEX_URL, copy);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(INDEX_URL).then(function (cached) {
          if (cached) return cached;
          return new Response('برای استفاده آفلاین یک‌بار با اینترنت باز کنید.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      var network = fetch(request).then(function (response) {
        if (response && response.status === 200 && request.url.indexOf(self.location.origin) === 0) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, clone);
          });
        }
        return response;
      });
      return cached || network;
    })
  );
});
