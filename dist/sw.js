const CACHE_PREFIX='myfoodcard-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=CACHE_PREFIX+'v4';
const FILES=['./','./index.html','./styles.css','./app.js','./theme.js','./domain.js','./translations.js','./countries.json','./icon.svg','./manifest.webmanifest'];
const urls=FILES.map(file=>new URL(file,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE).map(name=>caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{return await fetch(event.request);}
      catch{return (await caches.open(CACHE)).match(new URL('./index.html',self.registration.scope).href);}
    })());return;
  }
  if(urls.includes(url.href))event.respondWith((async()=>{
    const cached=await (await caches.open(CACHE)).match(event.request);
    return cached||fetch(event.request);
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type!=='CHECK_CACHE'||!event.ports[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const matches=await Promise.all(urls.map(url=>cache.match(url)));
    event.ports[0].postMessage({ready:matches.every(Boolean)});
  })());
});

