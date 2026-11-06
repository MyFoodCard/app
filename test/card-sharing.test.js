import test from 'node:test';
import assert from 'node:assert/strict';
import {cardMarkup,cardSummary} from '../dist/card.js';
import {qrSvg} from '../dist/qr.js';
import {createShareUrl} from '../dist/sharing.js';
import {emptyProfile,LANGUAGES,INGREDIENTS,DIETS} from '../dist/domain.js';
import {translations} from '../dist/translations.js';

test('plain-text summaries preserve avoidance levels, language and cross-contact intent',()=>{
  for(const language of LANGUAGES){
    const p={...emptyProfile(),language,mustAvoid:['flaxseed','trehalose'],avoidIfPossible:['lactose'],diets:['vegan']};
    const t=translations[language],summary=cardSummary(p),lines=summary.split('\n');
    assert.equal(lines[0],t.intolerances.mustAvoid+': '+t.ingredients.flaxseed+', '+t.ingredients.trehalose);
    assert.equal(lines[1],t.intolerances.preferAvoid+': '+t.ingredients.lactose);
    assert.equal(lines[2],t.dietHeading+': '+t.diets.vegan.label);
    assert.equal(lines[3],t.intolerances.crossContact);
    assert.ok(!summary.includes(t.intro));assert.doesNotMatch(summary,/<[^>]+>|undefined/);
    assert.equal(cardSummary({...p,crossContact:false}).split('\n').length,3);
    assert.equal(cardSummary({...p,mustAvoid:[]}).split('\n').length,2);
  }
});
test('QR codes cover the full supported profile and change with preferences and language',()=>{
  const p={...emptyProfile(),mustAvoid:INGREDIENTS,diets:DIETS};
  const en=createShareUrl(p,'https://myfoodcard.github.io/app/');
  const ar=createShareUrl({...p,language:'ar'},'https://myfoodcard.github.io/app/');
  const svg=qrSvg(en);
  assert.match(svg,/viewBox="0 0 \d+ \d+"/);assert.match(svg,/fill="#fff"/);assert.match(svg,/fill="#000"/);
  assert.notEqual(qrSvg(ar),svg);
  assert.equal(qrSvg(en),svg);
  assert.match(cardMarkup(p,false,en),/class="card-qr"/);
  assert.doesNotMatch(cardMarkup(emptyProfile(),false,''),/class="card-qr"/);
});
