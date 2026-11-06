import {translations} from './translations.js';
import {qrSvg} from './qr.js';
import {requirementCount} from './domain.js';
import {uiTranslations} from './ui-translations.js';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ingredients=(keys,labels)=>'<ul class="allergen-list">'+keys.map(key=>'<li>'+escape(labels[key])+'</li>').join('')+'</ul>';

export function cardMarkup(p,isSample=false,shareUrl='',appLanguage='en') {
  const t=translations[p.language];
  const ui=uiTranslations[appLanguage],uiDir=translations[appLanguage].dir;
  const top='<div class="card-brand" data-card-drag><span class="card-logo">myfoodcard<span class="brand-dot">.</span></span><span class="card-lang" dir="ltr">'+p.language.toUpperCase()+'</span></div>';
  if(!requirementCount(p))return top+'<div class="empty-state" lang="'+appLanguage+'" dir="'+uiDir+'"><img class="empty-icon" src="./icon.svg" alt=""><h3>'+escape(ui.preferences)+'</h3><p>'+escape(ui.intro)+'</p><button id="sample-button">'+escape(ui.sample)+'</button></div>';
  const must=p.mustAvoid.length?'<section class="card-allergies"><h3><span class="alert-icon" aria-hidden="true">!</span>'+escape(t.intolerances.mustAvoid)+'</h3>'+ingredients(p.mustAvoid,t.ingredients)+(p.crossContact?'<p class="cross-contact">'+escape(t.cardNotes.crossContact)+'</p>':'')+'</section>':'';
  const prefer=p.avoidIfPossible.length?'<section class="card-preferences"><h3>'+escape(t.intolerances.preferAvoid)+'</h3>'+ingredients(p.avoidIfPossible,t.ingredients)+'</section>':'';
  const diets=p.diets.length?'<section class="card-diets" aria-label="'+escape(t.dietHeading)+'">'+p.diets.map(key=>'<p class="diet-item"><strong>'+escape(t.diets[key].label)+'</strong> — '+escape(t.diets[key].instruction)+'</p>').join('')+'</section>':'';
  return top+(isSample?'<span class="sample-marker" lang="'+appLanguage+'" dir="'+uiDir+'">'+escape(ui.sampleMarker)+'</span>':'')+'<p class="card-intro">'+escape(t.intro)+'</p>'+must+prefer+diets+'<div class="card-footer"><p class="card-confirm">'+escape(t.cardNotes.confirm)+'</p>'+(shareUrl?'<button type="button" class="card-qr" aria-label="'+escape(t.qrLabel)+'">'+qrSvg(shareUrl)+'<span>'+escape(t.qrLabel)+' ↗</span></button>':'')+'</div>';
}

// Plain text for booking forms and messages; preserve required vs optional wording.
export function cardSummary(p){
  const t=translations[p.language],lines=[];
  if(p.mustAvoid.length)lines.push(t.intolerances.mustAvoid+': '+p.mustAvoid.map(key=>t.ingredients[key]).join(', '));
  if(p.avoidIfPossible.length)lines.push(t.intolerances.preferAvoid+': '+p.avoidIfPossible.map(key=>t.ingredients[key]).join(', '));
  if(p.diets.length)lines.push(t.dietHeading+': '+p.diets.map(key=>t.diets[key].label).join(', '));
  if(p.mustAvoid.length&&p.crossContact)lines.push(t.intolerances.crossContact);
  return lines.join('\n');
}
