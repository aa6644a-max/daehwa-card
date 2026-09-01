/* 오프라인에서도 화면이 뜨도록 하는 최소 서비스 워커.
   네트워크 우선 + 실패 시 캐시 → 배너 PNG를 갈아끼워도 바로 반영된다. */
const CACHE = 'daehwa-card-v4';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './assets/top-ko.png',   './assets/bottom-ko.png',
  './assets/top-en.png',   './assets/bottom-en.png',
  './assets/top-ja.png',   './assets/bottom-ja.png',
  './assets/top-zh.png',   './assets/bottom-zh.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/keepalive.mp4',
  './assets/keepalive.webm'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  /* cache:'no-cache' → HTTP 캐시를 건너뛰지 않되 항상 재검증한다.
     안 바뀌었으면 304 로 끝나므로 비용은 거의 없고, 파일을 갈아끼우면 즉시 반영된다. */
  e.respondWith(
    fetch(new Request(req, { cache: 'no-cache' }))
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
