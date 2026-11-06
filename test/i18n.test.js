import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {browserLanguage,initialAppLanguage,APP_LANGUAGE_KEY,uiText,localizedIngredientSearch} from '../dist/i18n.js';
import {uiTranslations} from '../dist/ui-translations.js';
import {translations} from '../dist/translations.js';
import {LANGUAGES,INGREDIENTS,emptyProfile} from '../dist/domain.js';
import {loadProfile,PROFILE_KEY} from '../dist/profile-storage.js';
import {cardMarkup} from '../dist/card.js';

test('browser preference order, region tags and unsupported-language fallback',()=>{
  assert.equal(browserLanguage(['fr-CA','en-GB']),'fr');
  assert.equal(browserLanguage(['ja-JP','sk-SK','en']),'sk');
  assert.equal(browserLanguage(['AR-eg']),'ar');
  assert.equal(browserLanguage(['cs_CZ']),'cs');
  assert.equal(browserLanguage(['pt-BR','ja-JP']),'en');
  assert.equal(browserLanguage([]),'en');
});
test('an explicit app-language preference wins, with safe fallback for blocked or invalid storage',()=>{
  assert.equal(initialAppLanguage({getItem:key=>key===APP_LANGUAGE_KEY?'th':null},['de-DE']),'th');
  assert.equal(initialAppLanguage({getItem:()=> 'invalid'},['de-DE']),'de');
  assert.equal(initialAppLanguage({getItem:()=>{throw Error('Blocked');}},['es-MX']),'es');
});
test('all interface messages, static DOM keys and interpolation tokens exist in every language',async()=>{
  const keys=Object.keys(uiTranslations.en).sort();
  const tokens=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  for(const code of LANGUAGES){
    assert.deepEqual(Object.keys(uiTranslations[code]).sort(),keys,code);
    for(const key of keys){
      assert.ok(uiTranslations[code][key].trim(),code+' '+key);
      assert.deepEqual(tokens(uiTranslations[code][key]),tokens(uiTranslations.en[key]),code+' '+key);
    }
    for(const [,key] of html.matchAll(/data-i18n(?:-label|-title|-placeholder)?="([^"]+)"/g))assert.ok(uiText(code,key),code+' '+key);
    assert.ok(!uiText(code,'addTo',{ingredient:'X',group:'Y'}).includes('{'));
  }
});
test('every ingredient is searchable by its translated name and English alias',()=>{
  for(const code of LANGUAGES)for(const key of INGREDIENTS){
    assert.ok(localizedIngredientSearch(translations[code].ingredients[key],code).includes(key),code+' '+key);
    assert.ok(localizedIngredientSearch(translations.en.ingredients[key],code).includes(key),code+' English '+key);
  }
  assert.ok(localizedIngredientSearch('lanove','sk').includes('flaxseed'));
});
test('new profiles use the app language without changing an existing or shared card language',()=>{
  assert.equal(loadProfile({getItem:()=>null},'ar').profile.language,'ar');
  const saved={...emptyProfile(),mustAvoid:['flaxseed'],language:'sk'};
  assert.deepEqual(loadProfile({getItem:key=>key===PROFILE_KEY?JSON.stringify(saved):null},'ar').profile,saved);
  const html=cardMarkup(saved,true,'','ar');
  assert.ok(html.includes(translations.sk.intro));
  assert.ok(html.includes(uiTranslations.ar.sampleMarker));
  assert.equal(saved.language,'sk');
});
