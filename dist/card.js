import {translations} from './translations.js';
import {requirementCount} from './domain.js';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ingredients=(keys,labels)=>'<ul class="allergen-list">'+keys.map(key=>'<li>'+escape(labels[key])+'</li>').join('')+'</ul>';

export function cardMarkup(p,isSample=false) {
  const t=translations[p.language];
  const top='<div class="card-brand"><span class="card-logo">myfoodcard<span class="brand-dot">.</span></span><span class="card-lang" dir="ltr">'+p.language.toUpperCase()+'</span></div>';
  if(!requirementCount(p))return top+'<div class="empty-state" lang="en" dir="ltr"><img class="empty-icon" src="./icon.svg" alt=""><h3>A card that speaks for you.</h3><p>Choose your dietary requirements and ingredients to avoid to create your restaurant card.</p><button id="sample-button">Try a sample card ↗</button><p class="tiny">Or start with your own preferences.</p></div>';
  const must=p.mustAvoid.length?'<section class="card-allergies"><h3><span class="alert-icon" aria-hidden="true">!</span>'+escape(t.intolerances.mustAvoid)+'</h3><p>'+escape(t.intolerances.mustIntro)+'</p>'+ingredients(p.mustAvoid,t.ingredients)+(p.crossContact?'<p class="cross-contact">'+escape(t.intolerances.crossContact)+'</p>':'')+'</section>':'';
  const prefer=p.avoidIfPossible.length?'<section class="card-preferences"><h3>'+escape(t.intolerances.preferAvoid)+'</h3><p>'+escape(t.intolerances.preferIntro)+'</p>'+ingredients(p.avoidIfPossible,t.ingredients)+'</section>':'';
  const diets=p.diets.length?'<section class="card-diets"><h3>'+escape(t.dietHeading)+'</h3>'+p.diets.map(key=>'<div class="diet-item"><span class="diet-check" aria-hidden="true">✓</span><div><h4>'+escape(t.diets[key].label)+'</h4><p>'+escape(t.diets[key].instruction)+'</p></div></div>').join('')+'</section>':'';
  return top+(isSample?'<span class="sample-marker" lang="en" dir="ltr">SAMPLE · Not your personal profile</span>':'')+'<p class="card-intro">'+escape(t.intro)+'</p>'+must+prefer+diets+'<p class="card-confirm">'+escape(t.confirm)+'</p><div class="card-footer"><p class="card-thanks">'+escape(t.thanks)+'</p></div>';
}
