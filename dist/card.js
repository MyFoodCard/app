import {translations} from './translations.js';
import {requirementCount} from './domain.js';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ingredients=(keys,labels)=>'<ul class="allergen-list">'+keys.map(key=>'<li>'+escape(labels[key])+'</li>').join('')+'</ul>';

export function cardMarkup(p,isSample=false) {
  const t=translations[p.language];
  const top='<div class="card-brand"><span class="card-logo">myfoodcard<span class="brand-dot">.</span></span><span class="card-lang" dir="ltr">'+p.language.toUpperCase()+'</span></div>';
  if(!requirementCount(p))return top+'<div class="empty-state" lang="en" dir="ltr"><img class="empty-icon" src="./icon.svg" alt=""><h3>A card that speaks for you.</h3><p>Choose your dietary requirements, allergies and intolerances to create your restaurant card.</p><button id="sample-button">Try a sample card ↗</button><p class="tiny">Or start with your own preferences.</p></div>';
  const allergy=p.allergens.length?'<section class="card-allergies"><h3><span class="alert-icon" aria-hidden="true">!</span>'+escape(t.allergyHeading)+'</h3><p>'+escape(t.allergyIntro)+'</p>'+ingredients(p.allergens,t.allergens)+(p.crossContact?'<p class="cross-contact">'+escape(t.crossContact)+'</p>':'')+'</section>':'';
  const groups=['must','prefer'].map(mode=>{
    const keys=p.intolerances.filter(item=>item.avoidance===mode).map(item=>item.ingredient);
    if(!keys.length)return '';
    const must=mode==='must';
    return '<div class="intolerance-group '+mode+'"><h4>'+escape(must?t.intolerances.mustAvoid:t.intolerances.preferAvoid)+'</h4><p>'+escape(must?t.intolerances.mustIntro:t.intolerances.preferIntro)+'</p>'+ingredients(keys,t.ingredients)+(must&&p.crossContact?'<p class="cross-contact">'+escape(t.intolerances.crossContact)+'</p>':'')+'</div>';
  }).join('');
  const intolerances=groups?'<section class="card-intolerances"><h3>'+escape(t.intolerances.heading)+'</h3>'+groups+'</section>':'';
  const diets=p.diets.length?'<section class="card-diets"><h3>'+escape(t.dietHeading)+'</h3>'+p.diets.map(key=>'<div class="diet-item"><span class="diet-check" aria-hidden="true">✓</span><div><h4>'+escape(t.diets[key].label)+'</h4><p>'+escape(t.diets[key].instruction)+'</p></div></div>').join('')+'</section>':'';
  return top+(isSample?'<span class="sample-marker" lang="en" dir="ltr">SAMPLE · Not your personal profile</span>':'')+'<p class="card-intro">'+escape(t.intro)+'</p>'+allergy+intolerances+diets+'<p class="card-confirm">'+escape(t.confirm)+'</p><div class="card-footer"><p class="card-thanks">'+escape(t.thanks)+'</p></div>';
}
