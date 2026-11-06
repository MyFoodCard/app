import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {ALLERGENS,INGREDIENTS,DIETS,LANGUAGES,emptyProfile,cleanProfile,searchIngredients,addIngredient,countryAt,languageSuggestions,inRing} from '../dist/domain.js';
import {translations} from '../dist/translations.js';
const {countries}=JSON.parse(await readFile(new URL('../dist/countries.json',import.meta.url),'utf8'));
test('a new profile does not invent a dietary or medical requirement',()=>{
  const p=emptyProfile();assert.deepEqual(p.mustAvoid,[]);assert.deepEqual(p.avoidIfPossible,[]);assert.deepEqual(p.diets,[]);assert.equal(Object.hasOwn(p,'name'),false);
});
test('version 1 allergies migrate to Must avoid without retaining names',()=>{
  const p=cleanProfile({version:1,name:'Legacy name',allergens:['flaxseed','flaxseed'],diets:['vegan'],language:'xx',crossContact:false});
  assert.deepEqual(p,{...emptyProfile(),mustAvoid:['flaxseed'],diets:['vegan'],crossContact:false});
  assert.throws(()=>cleanProfile({version:4}));assert.throws(()=>cleanProfile(null));assert.throws(()=>cleanProfile([]));
});
test('version 2 migration preserves strict intolerances and resolves duplicates to the stronger instruction',()=>{
  const original={version:2,allergens:['flaxseed'],diets:['vegan'],language:'sk',crossContact:true,intolerances:[
    {ingredient:'flaxseed',avoidance:'prefer'},
    {ingredient:'lactose',avoidance:'prefer'},
    {ingredient:'lactose',avoidance:'must'},
    {ingredient:'lactose',avoidance:'prefer'},
    {ingredient:'whitesugar',avoidance:'must'},
    {ingredient:'trehalose',avoidance:'must'},
    {ingredient:'onion',avoidance:'prefer'}]};
  const before=structuredClone(original),p=cleanProfile(original);
  assert.deepEqual(p,{...emptyProfile(),mustAvoid:['flaxseed','lactose','whitesugar','trehalose'],avoidIfPossible:['onion'],diets:['vegan'],language:'sk'});
  assert.deepEqual(original,before);
});
test('unsupported requirements fail instead of silently disappearing on import',()=>{
  for(const field of ['mustAvoid','avoidIfPossible','diets'])assert.throws(()=>cleanProfile({...emptyProfile(),[field]:['unknown']}),/unsupported/);
  for(const version of [1,2]){
    const legacy={version,allergens:[],diets:[],intolerances:[],language:'en',crossContact:true};
    assert.throws(()=>cleanProfile({...legacy,allergens:['unknown']}));
    for(const item of [null,{ingredient:'unknown',avoidance:'must'},{ingredient:'lactose',avoidance:'sometimes'}])assert.throws(()=>cleanProfile({...legacy,intolerances:[item]}));
  }
  assert.throws(()=>cleanProfile({...emptyProfile(),mustAvoid:undefined}));
  assert.throws(()=>cleanProfile({...emptyProfile(),avoidIfPossible:null}));
  assert.throws(()=>cleanProfile({...emptyProfile(),language:'xx'}));
});
test('adding a requirement moves it to Must avoid without allowing a duplicate to weaken it',()=>{
  const optional={...emptyProfile(),avoidIfPossible:['milk','onion']};
  const required=addIngredient(optional,'mustAvoid','milk');
  assert.deepEqual(required.mustAvoid,['milk']);assert.deepEqual(required.avoidIfPossible,['onion']);
  assert.deepEqual(addIngredient(required,'avoidIfPossible','milk'),required);
  assert.deepEqual(optional.avoidIfPossible,['milk','onion']);
});
test('one search covers common allergens, additional allergens and intolerance ingredients',()=>{
  const labels=translations.en.ingredients;
  assert.deepEqual(searchIngredients('milk',labels),['milk']);
  assert.deepEqual(searchIngredients('linseed',labels),['flaxseed']);
  assert.deepEqual(searchIngredients('cashew',labels),['cashew']);
  assert.deepEqual(searchIngredients(' WHITE   SUGAR ',labels),['whitesugar']);
  assert.deepEqual(searchIngredients('trehalose',labels),['trehalose']);
  assert.deepEqual(searchIngredients('unknown ingredient',labels),[]);
  assert.equal(searchIngredients('',labels).length,INGREDIENTS.length);
});
test('all supported cards have complete allergen, diet, instruction and tagline translations',()=>{
  for(const code of LANGUAGES){
    const t=translations[code];assert.ok(t.tagline);assert.ok(t.confirm);assert.ok(t.crossContact);
    for(const key of ALLERGENS)assert.ok(t.allergens[key]?.length>1,code+' '+key);
    for(const key of INGREDIENTS)assert.ok(t.ingredients[key]?.length>1,code+' '+key);
    for(const key of ['heading','mustAvoid','preferAvoid','mustIntro','preferIntro','crossContact'])assert.ok(t.intolerances[key],code+' '+key);
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
  let networkRequests=0;
  const listeners={},entries=new Map(),scope='https://example.test'+basePath;
  const oldCache='myfoodcard-'+encodeURIComponent(basePath)+'-v1';
  const otherAppCache='myfoodcard-'+encodeURIComponent('/another-app/')+'-v1';
  const cache={addAll:async requests=>{for(const req of requests){const url=new URL(req.url);const path=url.pathname.slice(basePath.length)||'index.html';const content=await readFile(new URL('../dist/'+path,import.meta.url),'utf8');entries.set(req.url,new Response(content));}},match:async request=>entries.get(typeof request==='string'?request:request.url)?.clone()};
  const context={URL,Request,Response,Promise,caches:{open:async()=>cache,keys:async()=>[oldCache,otherAppCache,'unrelated'],delete:async name=>assert.equal(name,oldCache)},fetch:async()=>{networkRequests++;throw new Error('Offline');},self:{location:new URL(scope),registration:{scope},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,callback)=>{listeners[name]=callback;}}};
  vm.runInNewContext(await readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),context);
  let promise;listeners.install({waitUntil:p=>{promise=p;}});await promise;
  assert.equal(entries.size,17);
  listeners.activate({waitUntil:p=>{promise=p;}});await promise;
  let response;listeners.fetch({request:{method:'GET',url:scope,mode:'navigate'},respondWith:p=>{response=p;}});
  assert.match(await (await response).text(),/MyFoodCard/);
  assert.equal(networkRequests,0,'navigation must use the same cached bundle as its scripts');
  listeners.fetch({request:new Request(scope+'translations.js'),respondWith:p=>{response=p;}});
  assert.match(await (await response).text(),/بذور الكتان/);
  listeners.fetch({request:new Request(scope+'theme.js'),respondWith:p=>{response=p;}});
  assert.match(await (await response).text(),/myfoodcard.theme.v1/);
  listeners.fetch({request:new Request(scope+'ingredient-translations.js'),respondWith:p=>{response=p;}});
  assert.match(await (await response).text(),/trehalose/);
  listeners.fetch({request:new Request(scope+'card.js'),respondWith:p=>{response=p;}});
  assert.match(await (await response).text(),/mustAvoid/);
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
