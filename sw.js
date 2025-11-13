// 오프라인 실행/설치를 위한 Service Worker (정적 파일)
// 캐시 전략: 네비게이션은 네트워크 우선, 실패 시 캐시 폴백 / 정적GET은 캐시 우선-네트워크 갱신


const CACHE = 'scan-pwa-v8';


function isHttpLike(reqOrUrl){
try{ const u = typeof reqOrUrl === 'string' ? new URL(reqOrUrl, self.location.href) : new URL(reqOrUrl.url); return u.protocol==='http:'||u.protocol==='https:'; }catch(_){ return false; }
}


self.addEventListener('install', (event) => {
event.waitUntil((async () => {
const cache = await caches.open(CACHE);
const seeds = await inferCoreAssets();
for(const url of seeds){ if(!isHttpLike(url)) continue; try{ const req=new Request(url,{cache:'reload'}); const resp=await fetch(req); if(resp.ok) await cache.put(req, resp.clone()); }catch(_){} }
})());
self.skipWaiting();
});


self.addEventListener('activate', (event) => {
event.waitUntil((async () => { const keys=await caches.keys(); await Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k))); })());
self.clients.claim();
});


self.addEventListener('fetch', (event) => {
const req = event.request; if(!isHttpLike(req)) return;


if(req.mode==='navigate'){
event.respondWith((async ()=>{
try{ const net=await fetch(req); const cache=await caches.open(CACHE); cache.put(req, net.clone()).catch(()=>{}); return net; }
catch{ const cache=await caches.open(CACHE); return (await cache.match(req)) || (await cache.match('./index.html')) || (await cache.match('./')) || Response.error(); }
})());
return;
}


if(req.method==='GET'){
event.respondWith(
caches.match(req).then(cached=>cached || fetch(req).then(resp=>{ const copy=resp.clone(); caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{}); return resp; }).catch(()=>caches.match('./index.html')))
);
}
});


async function inferCoreAssets(){
try{ const cl = await self.clients.matchAll({ type:'window', includeUncontrolled:true }); if(cl && cl.length){ const u=new URL(cl[0].url); const current = './' + (u.pathname.startsWith('/')? u.pathname.slice(1):u.pathname); return [current,'./index.html','./','./sw.js']; } }catch(_){ }
return ['./index.html','./','./sw.js'];
}