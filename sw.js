const CACHE_NAME = 'oud-prime-app-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './logo_2.jpg',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Instalação do Service Worker e gravação do Cache Inicial
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW OUD PRIME] Salvando recursos para uso offline...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[SW OUD PRIME] Falha parcial ao armazenar assets em cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW OUD PRIME] Apagando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de busca: Tenta a rede primeiro. Se estiver offline, entrega o Cache
self.addEventListener('fetch', event => {
  // Ignora requisições para APIs externas (ex: Google Apps Script) para não interferir na fila offline
  if (event.request.url.includes('script.google.com') || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Aceita respostas normais (200) e opacas (0 - vindas de CDNs externas)
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0) && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Se estiver offline, recupera o recurso do cache do dispositivo
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se for navegação de página principal e estiver offline, entrega o index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});
