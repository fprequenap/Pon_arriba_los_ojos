/* Pon arriba los ojos — service worker */
const VERSION = "pon-v3";                       // súbelo (v2, v3…) al publicar cambios
const CORE = [
  "./","./index.html","./app.js","./content.js","./psalms.js","./manifest.json",
  "./icon-192.png","./icon-512.png","./apple-touch-icon.png","./favicon-32.png","./icon-maskable-512.png",
  "./pelayo.jpg"
];
self.addEventListener("install", e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method!=="GET") return;
  const url = new URL(req.url);
  // Google Fonts: cache-first runtime
  if(/fonts\.(googleapis|gstatic)\.com/.test(url.host)){
    e.respondWith(caches.open("fonts").then(async c=>{
      const hit = await c.match(req); if(hit) return hit;
      try{ const res = await fetch(req); c.put(req, res.clone()); return res; }catch(err){ return hit || Response.error(); }
    }));
    return;
  }
  if(url.origin!==location.origin) return;
  // app shell: cache-first, refresh in background
  e.respondWith(caches.open(VERSION).then(async c=>{
    const hit = await c.match(req, {ignoreSearch:true});
    const net = fetch(req).then(res=>{ if(res && res.ok) c.put(req, res.clone()); return res; }).catch(()=>null);
    return hit || net || caches.match("./index.html");
  }));
});
