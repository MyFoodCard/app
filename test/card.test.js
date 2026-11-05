import test from 'node:test';
import assert from 'node:assert/strict';
import {cardMarkup} from '../dist/card.js';
import {emptyProfile,LANGUAGES,cleanProfile} from '../dist/domain.js';
import {translations} from '../dist/translations.js';

test('allergy warnings stay distinct from both intolerance instruction levels',()=>{
  const html=cardMarkup(cleanProfile({...emptyProfile(),allergens:['flaxseed'],intolerances:[
    {ingredient:'flaxseed',avoidance:'prefer'},
    {ingredient:'whitesugar',avoidance:'must'},
    {ingredient:'trehalose',avoidance:'must'},
    {ingredient:'lactose',avoidance:'prefer'}]}));
  const allergy=html.match(/<section class="card-allergies">(.*?)<\/section>/s)[1];
  assert.match(allergy,/Flaxseed \/ linseed/);assert.match(allergy,/must not contain/);
  assert.doesNotMatch(allergy,/Lactose|White sugar|Trehalose/);
  const must=html.match(/<div class="intolerance-group must">(.*?)<\/div>/s)[1];
  const prefer=html.match(/<div class="intolerance-group prefer">(.*?)<\/div>/s)[1];
  assert.match(must,/White sugar/);assert.match(must,/Trehalose/);assert.match(must,/Please do not use/);assert.match(must,/cross-contact/);
  assert.match(prefer,/Lactose/);assert.match(prefer,/Avoid if possible/);assert.doesNotMatch(prefer,/cross-contact/);
});
test('intolerance-only cards render translated instructions without an allergy claim',()=>{
  for(const language of LANGUAGES){
    const html=cardMarkup({...emptyProfile(),language,crossContact:false,intolerances:[{ingredient:'trehalose',avoidance:'must'}]});
    assert.ok(html.includes(translations[language].ingredients.trehalose));
    assert.ok(html.includes(translations[language].intolerances.mustIntro));
    assert.doesNotMatch(html,/undefined|card-allergies|empty-state|cross-contact/);
  }
});
