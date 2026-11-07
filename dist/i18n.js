import {LANGUAGES,searchIngredients} from './domain.js';
import {translations} from './translations.js';
import {uiTranslations} from './ui-translations.js';

export const APP_LANGUAGE_KEY='myfoodcard.app-language.v1';
export function browserLanguage(languages=[]){
  for(const language of languages){
    const tag=String(language).toLowerCase().split(/[-_]/)[0];
    const base=({tl:'fil',in:'id'})[tag]||tag;
    if(LANGUAGES.includes(base))return base;
  }
  return 'en';
}
export function initialAppLanguage(storage,languages){
  try{const saved=storage.getItem(APP_LANGUAGE_KEY);if(LANGUAGES.includes(saved))return saved;}catch{}
  return browserLanguage(languages);
}
export function uiText(language,key,values={}){
  const t=translations[language]||translations.en;
  const shared={mustAvoid:t.intolerances.mustAvoid,avoidIfPossible:t.intolerances.preferAvoid};
  const text=shared[key]??uiTranslations[language]?.[key]??uiTranslations.en[key];
  if(text===undefined)throw new Error('Missing UI message: '+key);
  return text.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??'{'+name+'}'));
}
export function localizeDOM(root,language){
  for(const el of root.querySelectorAll('[data-i18n]'))el.textContent=uiText(language,el.dataset.i18n);
  for(const [suffix,attribute] of [['label','aria-label'],['title','title'],['placeholder','placeholder']]){
    for(const el of root.querySelectorAll('[data-i18n-'+suffix+']'))el.setAttribute(attribute,uiText(language,el.getAttribute('data-i18n-'+suffix)));
  }
}
export function localizedIngredientSearch(query,language){
  const labels=translations[language].ingredients;
  // Keep English names searchable when travelling, while displaying local labels.
  return [...new Set([...searchIngredients(query,labels),...searchIngredients(query,translations.en.ingredients)])]
    .sort((a,b)=>labels[a].localeCompare(labels[b],language));
}
