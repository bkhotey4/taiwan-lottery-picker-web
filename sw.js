// 彩券號碼機 App 的離線快取
// - 網頁本身、統計、AI 預測（所有 .json）：先抓網路上最新的，失敗（離線）才用快取，所以網頁更新後會自動拿到新版
// - 圖示、設定檔：先用快取
// - 台灣彩券 API 與 Google 字型：不快取，直接走網路
const CACHE = 'lotto-app-v36';
const CORE = ['./', 'index.html', 'stats.json', 'history.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API、字型不經過快取

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('.json'); // 統計、每期號碼、AI 預測（ai.json）都要拿最新的
  if (isPage) {
    // cache:'no-cache'：每次都跟伺服器確認有沒有新版（GitHub Pages 會讓瀏覽器把舊版留 10 分鐘）
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
