const CACHE_NAME = 'presenze-munaf-v13';
const ASSETS = ['./', './index.html', './style.css', './app.js',
  './storage.js', './calculations.js', './export.js',
  './manifest.json', './assets/icon-192.svg', './assets/icon-512.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(()=>{}))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; e.respondWith(fetch(e.request).then(r => { if (r && r.status === 200) { const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)); } return r; }).catch(() => caches.match(e.request))); });
Commit → poi dimmi se si aggiorna! 😊Sonnet 4.6 BassoClaude è un'AI e può commettere errori. Verifica le risposte.Presenze munaf v13 completo · ZIP
