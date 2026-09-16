const CACHE='guidance-of-grace-v4';
const CORE=['./','./index.html','./styles.css','./app.js','./data.js','./save-parser.js','./cloud.js','./manifest.webmanifest','./content/dlc-quests.js','./content/story-data.js','./content/recommendations.js','./content/item-links.js','./desktop/core.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==location.origin)return;
  if(url.pathname.endsWith('/cloud-config.js')){event.respondWith(fetch(event.request));return}
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response})));
});
