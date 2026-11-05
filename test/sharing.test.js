import test from 'node:test';
import assert from 'node:assert/strict';
import {ALLERGENS, INGREDIENTS, DIETS, LANGUAGES, emptyProfile} from '../dist/domain.js';
import {createShareUrl, readSharedProfile} from '../dist/sharing.js';

const fragment = data => '#card=' + btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test('share links round-trip every supported requirement and language under GitHub Pages', () => {
  for (const language of LANGUAGES) {
    const profile = {...emptyProfile(), mustAvoid: [...INGREDIENTS], diets: [...DIETS], crossContact: false, language};
    const link = new URL(createShareUrl(profile, 'https://myfoodcard.github.io/app/?discard=this#old'));
    assert.equal(link.pathname, '/app/');
    assert.equal(link.search, '');
    assert.ok(link.hash.startsWith('#card='));
    assert.deepEqual(readSharedProfile(link.hash), profile);
  }
});

test('links contain only food preferences and parsing does not mutate the original profile', () => {
  const profile = {...emptyProfile(), name: 'Legacy name', token: 'Not for sharing', mustAvoid: ['flaxseed'], diets: ['vegan']};
  const before = structuredClone(profile);
  const decoded = readSharedProfile(new URL(createShareUrl(profile, 'https://example.test/')).hash);
  assert.equal(Object.hasOwn(decoded, 'name'), false);
  assert.equal(Object.hasOwn(decoded, 'token'), false);
  decoded.mustAvoid.push('milk');
  assert.deepEqual(profile, before);
});

test('invalid or unsupported links fail rather than silently losing requirements', () => {
  const valid = {v: 1, a: ['flaxseed'], d: ['vegan'], c: true, l: 'en'};
  for (const data of [null, [], {...valid, v: 4}, {...valid, a: ['unknown-allergy']},
    {...valid, a: 'flaxseed'}, {...valid, d: ['unknown-diet']}, {...valid, d: null},
    {...valid, c: 'true'}, {...valid, l: 'xx'}, {...valid, a: [], d: []},
    {...valid, a: Array(100).fill('flaxseed')}]) {
    assert.throws(() => readSharedProfile(fragment(data)), /invalid or unsupported/);
  }
  for (const hash of ['#card=', '#card=***', '#card=eA', '#card=' + 'x'.repeat(8193),
    fragment(valid) + '&card=duplicate', fragment(valid) + '&extra=field']) {
    assert.throws(() => readSharedProfile(hash), /invalid or unsupported/);
  }
  assert.throws(() => createShareUrl(emptyProfile(), 'https://example.test/'));
});

test('already-shared version 1 links preserve their original requirements',()=>{
  const p=readSharedProfile('#card=eyJ2IjoxLCJhIjpbImZsYXhzZWVkIl0sImQiOlsidmVnYW4iXSwiYyI6dHJ1ZSwibCI6ImVuIn0');
  assert.deepEqual(p,{...emptyProfile(),mustAvoid:['flaxseed'],diets:['vegan']});
});

test('optional-only links preserve every ingredient and language',()=>{
  for(const language of LANGUAGES){
    const p={...emptyProfile(),language,avoidIfPossible:[...INGREDIENTS]};
    const url=new URL(createShareUrl(p,'https://myfoodcard.github.io/app/'));
    assert.ok(url.hash.length<8192);assert.deepEqual(readSharedProfile(url.hash),p);
  }
});

test('version 2 links retain both avoidance levels after migration',()=>{
  const p=readSharedProfile(fragment({v:2,a:['flaxseed'],d:['vegan'],i:[['whitesugar','must'],['trehalose','must'],['lactose','prefer']],c:false,l:'de'}));
  assert.deepEqual(p,{...emptyProfile(),mustAvoid:['flaxseed','whitesugar','trehalose'],avoidIfPossible:['lactose'],diets:['vegan'],crossContact:false,language:'de'});
});

test('version 3 links reject missing or unsupported ingredient lists',()=>{
  const valid={v:3,m:['flaxseed'],p:['onion'],d:[],c:true,l:'en'};
  for(const data of [{...valid,m:undefined},{...valid,p:null},{...valid,m:['unknown']},{...valid,p:['unknown']},{...valid,m:[],p:[]}])assert.throws(()=>readSharedProfile(fragment(data)),/invalid or unsupported/);
  assert.deepEqual(readSharedProfile(fragment({...valid,p:['flaxseed','onion']})).avoidIfPossible,['onion']);
});

test('invalid avoidance instructions are never shared as a weaker requirement',()=>{
  const valid={v:2,a:[],d:[],i:[['trehalose','must']],c:true,l:'en'};
  for(const data of [{...valid,i:undefined},{...valid,i:null},{...valid,i:[['trehalose','optional']]},
    {...valid,i:[['unknown','must']]},{...valid,i:[['trehalose','must','extra']]},{...valid,v:1}]){
    assert.throws(()=>readSharedProfile(fragment(data)),/invalid or unsupported/);
  }
});

test('ordinary anchors do not create shared profiles', () => {
  assert.equal(readSharedProfile(''), null);
  assert.equal(readSharedProfile('#main'), null);
});
