'use strict';
const CACHE='mi-rodalies-v2.1.0-20261111';
const STATIC=['./','./index.html','./styles.css?v=210','./engine.js?v=210','./app.js?v=210','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x.startsWith('mi-rodalies-')&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
 const isData=/\/data\//.test(u.pathname)||u.pathname.endsWith('.json');
 if(isData){e.respondWith(fetch(r,{cache:'no-store'}).catch(()=>caches.match(r)));return;}
 e.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{});}return res;}).catch(()=>caches.match(r)));});
