import test from 'node:test';
import assert from 'node:assert/strict';
import {cardMarkup} from '../dist/card.js';
import {emptyProfile,LANGUAGES,INGREDIENTS,DIETS,cleanProfile} from '../dist/domain.js';
import {translations} from '../dist/translations.js';

test('card has one Must avoid section and one optional section with no redundant intolerance heading',()=>{
  const html=cardMarkup(cleanProfile({...emptyProfile(),mustAvoid:['flaxseed','whitesugar','trehalose'],avoidIfPossible:['lactose']}));
  const must=html.match(/<section class="card-allergies">(.*?)<\/section>/s)[1];
  const prefer=html.match(/<section class="card-preferences">(.*?)<\/section>/s)[1];
  assert.match(must,/Must avoid/);assert.match(must,/Flaxseed \/ linseed/);assert.match(must,/White sugar/);assert.match(must,/Trehalose/);assert.match(must,/Prevent cross-contact/);
  assert.doesNotMatch(must,/Lactose/);assert.match(prefer,/Lactose/);assert.match(prefer,/Avoid if possible/);assert.doesNotMatch(prefer,/cross-contact/);
  assert.doesNotMatch(html,/Intolerances \/ sensitivities|<h4>|<select/);
});
test('required and optional-only cards render translated instructions without claiming an allergy',()=>{
  for(const language of LANGUAGES)for(const group of ['mustAvoid','avoidIfPossible']){
    const html=cardMarkup({...emptyProfile(),language,crossContact:false,[group]:['trehalose']});
    assert.ok(html.includes(translations[language].ingredients.trehalose));
    assert.ok(html.includes(translations[language].intolerances[group==='mustAvoid'?'mustAvoid':'preferAvoid']));
    assert.ok(!html.includes(translations[language].allergyIntro));
    assert.doesNotMatch(html,/undefined|empty-state|cross-contact/);
    assert.equal((html.match(/<section/g)||[]).length,1);
  }
});
test('compact cards retain every ingredient, dietary instruction and essential note in each language',()=>{
  const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  for(const language of LANGUAGES){
    const t=translations[language];
    const html=cardMarkup({...emptyProfile(),language,mustAvoid:INGREDIENTS,diets:DIETS});
    for(const key of INGREDIENTS)assert.ok(html.includes(escape(t.ingredients[key])),language+' '+key);
    for(const key of DIETS){
      assert.ok(html.includes(escape(t.diets[key].label)),language+' '+key);
      assert.ok(html.includes(escape(t.diets[key].instruction)),language+' '+key+' instruction');
    }
    for(const note of [t.intro,t.cardNotes.crossContact,t.cardNotes.confirm])assert.ok(html.includes(escape(note)),language+' note');
    assert.doesNotMatch(html,/undefined/);
  }
});
