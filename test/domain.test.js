import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {ALLERGENS,DIETS,LANGUAGES,emptyProfile,cleanProfile,countryAt,languageSuggestions,inRing} from '../dist/domain.js';
import {translations} from '../dist/translations.js';
const {countries}=JSON.parse(await readFile(new URL('../dist/countries.json',import.meta.url),'utf8'));
test('a new profile does not invent a dietary or medical requirement',()=>{
  const p=emptyProfile();assert.deepEqual(p.allergens,[]);assert.deepEqual(p.diets,[]);assert.equal(p.name,'');
});
test('import ignores unknown values, deduplicates, limits names, and rejects future versions',()=>{
  const p=cleanProfile({version:1,name:'x'.repeat(100),allergens:['flaxseed','flaxseed','__proto__'],diets:['vegan','no-such-diet'],language:'xx',crossContact:false});
  assert.deepEqual(p.allergens,['flaxseed']);assert.deepEqual(p.diets,['vegan']);assert.equal(p.name.length,60);assert.equal(p.language,'en');assert.equal(p.crossContact,false);
  assert.throws(()=>cleanProfile({version:2}));assert.throws(()=>cleanProfile(null));assert.throws(()=>cleanProfile([]));
});
test('all supported cards have complete allergen, diet, instruction and tagline translations',()=>{
  for(const code of LANGUAGES){
    const t=translations[code];assert.ok(t.tagline);assert.ok(t.confirm);assert.ok(t.crossContact);
    for(const key of ALLERGENS)assert.ok(t.allergens[key]?.length>1,code+' '+key);
    for(const key of DIETS){assert.ok(t.diets[key]?.label);assert.ok(t.diets[key]?.instruction);}
  }
  assert.equal(translations.ar.dir,'rtl');assert.equal(translations.th.dir,'ltr');
});
test('offline lookup matches representative cities and leaves unsupported languages explicit',()=>{
  for(const [lon,lat,code,language] of [[17.1077,48.1486,'SVK','sk'],[14.4378,50.0755,'CZE','cs'],[16.3738,48.2082,'AUT','de'],[13.405,52.52,'DEU','de'],[2.3522,48.8566,'FRA','fr'],[-3.7038,40.4168,'ESP','es'],[31.2357,30.0444,'EGY','ar'],[100.5018,13.7563,'THA','th'],[-.1276,51.5072,'GBR','en']]){
    assert.equal(countryAt(lon,lat,countries)?.code,code);assert.ok(languageSuggestions(code).includes(language));
  }
  assert.deepEqual(languageSuggestions('JPN'),[]);assert.equal(countryAt(-35,0,countries),null);assert.equal(countryAt(NaN,0,countries),null);
});
test('point-in-polygon respects holes and multipart geometry',()=>{
  const outer=[[0,0],[10,0],[10,10],[0,10],[0,0]],hole=[[4,4],[6,4],[6,6],[4,6],[4,4]];
  const f={code:'TEST',geometry:{type:'Polygon',coordinates:[outer,hole]}};
  assert.equal(countryAt(2,2,[f]),f);assert.equal(countryAt(5,5,[f]),null);assert.equal(inRing(20,20,outer),false);
  assert.equal(countryAt(2,2,[{...f,geometry:{type:'MultiPolygon',coordinates:[[outer,hole]]}}])?.code,'TEST');
});
for(const basePath of ['/', '/app/']) test('offline shell and translations work under '+basePath,async()=>{
  const listeners={},entries=new Map(),scope='https://example.test'+basePath;
  const oldCache='myfoodcard-'+encodeURIComponent(basePath)+'-v1';
  const otherAppCache='myfoodcard-'+encodeURIComponent('/another-app/')+'-v1';
  const cache={addAll:async requests=>{for(const req of requests){const url=new URL(req.url);const path=url.pathname.slice(basePath.length)||'index.html';const content=await readFile(new URL('../dist/'+path,import.meta.url),'utf8');entries.set(req.url,new Response(content));}},match:async request=>entries.get(typeof request==='string'?request:request.url)?.clone()};
  const context={URL,Request,Response,Promise,caches:{open:async()=>cache,keys:async()=>[oldCache,otherAppCache,'unrelated'],delete:async name=>assert.equal(name,oldCache)},fetch:async()=>{throw new Error('Offline');},self:{location:new URL(scope),registration:{scope},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,callback)=>{listeners[name]=callback;}}};
  vm.runInNewContext(await readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),context);
  let promise;listeners.install({waitUntil:p=>{promise=p;}});await promise;
  assert.equal(entries.size,9);
  listeners.activate({waitUntil:p=>{promise=p;}});await promise;
  let response;listeners.fetch({request:{method:'GET',url:scope,mode:'navigate'},respondWith:p=>{response=p;}});
  assert.match(await (await response).text(),/MyFoodCard/);
  listeners.fetch({request:new Request(scope+'translations.js'),respondWith:p=>{response=p;}});
  assert.match(await (await response).text(),/بذور الكتان/);
  let ready;listeners.message({data:{type:'CHECK_CACHE'},ports:[{postMessage:value=>{ready=value.ready;}}],waitUntil:p=>{promise=p;}});await promise;assert.equal(ready,true);
  entries.delete(scope+'countries.json');listeners.message({data:{type:'CHECK_CACHE'},ports:[{postMessage:value=>{ready=value.ready;}}],waitUntil:p=>{promise=p;}});await promise;assert.equal(ready,false);
});


test('installation paths stay within the GitHub Pages project',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../dist/manifest.webmanifest',import.meta.url),'utf8'));
  const manifestUrl='https://myfoodcard.github.io/app/manifest.webmanifest';
  const start=new URL(manifest.start_url,manifestUrl);
  assert.equal(start.pathname,'/app/');
  assert.equal(new URL(manifest.scope,manifestUrl).pathname,'/app/');
  assert.equal(new URL(manifest.id,start).pathname,'/app/');
  for(const icon of manifest.icons)assert.ok(new URL(icon.src,manifestUrl).pathname.startsWith('/app/'));
});
