// Bump this version whenever any cached file changes, so clients pick up updates.
const CACHE_VERSION = 'ledger-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/calc.js',
  './js/firebase-config.js',
  './js/views/dashboard.js',
  './js/views/sales.js',
  './js/views/inventory.js',
  './js/views/expenses.js',
  './js/views/debts.js',
  './js/views/budget.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for Firebase/API calls (never cache live data), cache-first for the app shell.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin.includes('firestore') || url.origin.includes('googleapis') || url.origin.includes('gstatic')) {
    return; // let these go straight to the network, Firestore handles its own offline cache
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
