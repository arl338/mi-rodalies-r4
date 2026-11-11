'use strict';
const CACHE='mi-rodalies-v1-5-20261111';
const STATIC=['./','./index.html','./styles.css?v=15','./app.js?v=15','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('mi-rodalies-')&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok&&!u.pathname.endsWith('.json')){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{});}return res;}).catch(()=>caches.match(r)));});
