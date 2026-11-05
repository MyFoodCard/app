import {ALLERGENS,DIETS,LANGUAGES,emptyProfile,cleanProfile,toggleItem,countryAt,languageSuggestions} from './domain.js';
import {translations} from './translations.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const KEY='myfoodcard.profile.v1';
let profile=emptyProfile(), sample=false, offlineReady=false;
try{const raw=localStorage.getItem(KEY);if(raw)profile=cleanProfile(JSON.parse(raw));}catch{$('form-message').textContent='Saved data could not be read. You can create a fresh profile below.';}
const english=translations.en;
function activeProfile(){return sample?{...profile,allergens:['flaxseed'],diets:['vegan'],crossContact:true}:profile;}
function buildOptions(){
  for(const [type,keys,root] of [['diets',DIETS,'diet-options'],['allergens',ALLERGENS,'allergen-options']]){
    $(root).innerHTML=keys.map(key=>'<label class="chip"><input type="checkbox" data-group="'+type+'" aria-label="'+escape(type==='diets'?english.diets[key].label:english.allergens[key])+'" value="'+key+'"><span>'+escape(type==='diets'?english.diets[key].label:english.allergens[key])+'</span></label>').join('');
  }
  $('card-language').innerHTML=LANGUAGES.map(code=>'<option value="'+code+'">'+escape(translations[code].native)+' · '+escape(translations[code].english)+'</option>').join('');
}
function syncEditor(){
  $('cross-contact').checked=profile.crossContact;
  $('card-language').value=profile.language;
  document.querySelectorAll('[data-group]').forEach(input=>input.checked=profile[input.dataset.group].includes(input.value));
}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(profile));$('save-status').textContent='Saved on device';}
  catch{$('save-status').textContent='Not saved';$('form-message').textContent='This browser cannot save your profile. Export it to keep a copy.';}
}
function cardMarkup(p, isSample=false){
  const t=translations[p.language];
  const hasData=p.allergens.length+p.diets.length>0;
  const top='<div class="card-brand"><span class="card-logo">myfoodcard<span class="brand-dot">.</span></span><span class="card-lang" dir="ltr">'+p.language.toUpperCase()+'</span></div>';
  if(!hasData)return top+'<div class="empty-state" lang="en" dir="ltr"><img class="empty-icon" src="./icon.svg" alt=""><h3>A card that speaks for you.</h3><p>Choose your dietary requirements and allergies to create your restaurant card.</p><button id="sample-button">Try a sample card ↗</button><p class="tiny">Or start with your own preferences.</p></div>';
  const allergy=p.allergens.length?'<section class="card-allergies"><h3><span class="alert-icon" aria-hidden="true">!</span>'+escape(t.allergyHeading)+'</h3><p>'+escape(t.allergyIntro)+'</p><ul class="allergen-list">'+p.allergens.map(key=>'<li>'+escape(t.allergens[key])+'</li>').join('')+'</ul>'+(p.crossContact?'<p class="cross-contact">'+escape(t.crossContact)+'</p>':'')+'</section>':'';
  const diets=p.diets.length?'<section class="card-diets"><h3>'+escape(t.dietHeading)+'</h3>'+p.diets.map(key=>'<div class="diet-item"><span class="diet-check" aria-hidden="true">✓</span><div><h4>'+escape(t.diets[key].label)+'</h4><p>'+escape(t.diets[key].instruction)+'</p></div></div>').join('')+'</section>':'';
  return top+(isSample?'<span class="sample-marker" lang="en" dir="ltr">SAMPLE · Not your personal profile</span>':'')+'<p class="card-intro">'+escape(t.intro)+'</p>'+allergy+diets+'<p class="card-confirm">'+escape(t.confirm)+'</p><div class="card-footer"><p class="card-thanks">'+escape(t.thanks)+'</p></div>';
}
function renderCard(){
  const p=activeProfile(),t=translations[p.language];
  $('food-card').innerHTML=cardMarkup(p,sample);
  $('food-card').lang=p.language;$('food-card').dir=t.dir;
  $('sample-banner').hidden=!sample;
  const count=p.allergens.length+p.diets.length;
  $('selected-count').textContent=count?count+' selected':'Your personal card';
  $('present-button').disabled=!count;$('print-button').disabled=!count;
  $('sample-button')?.addEventListener('click',()=>{sample=true;renderCard();});
}
function edit(){sample=false;save();renderCard();}
buildOptions();syncEditor();renderCard();
document.querySelectorAll('[data-group]').forEach(input=>input.addEventListener('change',()=>{
  const group=input.dataset.group;profile[group]=toggleItem(profile[group],input.value,input.checked);edit();
}));
$('cross-contact').addEventListener('change',event=>{profile.crossContact=event.target.checked;edit();});
$('card-language').addEventListener('change',event=>{profile.language=event.target.value;save();renderCard();$('location-result').hidden=true;});
$('exit-sample').addEventListener('click',()=>{sample=false;renderCard();});
function viewCard(show){document.querySelector('.workspace').classList.toggle('show-card',show);$('edit-tab').setAttribute('aria-pressed',String(!show));$('card-tab').setAttribute('aria-pressed',String(show));}
$('edit-tab').addEventListener('click',()=>viewCard(false));$('card-tab').addEventListener('click',()=>viewCard(true));
$('present-button').addEventListener('click',()=>{
  const p=activeProfile(),t=translations[p.language];
  $('present-card').innerHTML='<article class="food-card" lang="'+p.language+'" dir="'+t.dir+'">'+cardMarkup(p,sample)+'</article>';
  $('present-dialog').showModal();
});
$('close-present').addEventListener('click',()=>$('present-dialog').close());
$('print-button').addEventListener('click',()=>window.print());
$('about-button').addEventListener('click',()=>$('about-dialog').showModal());
$('close-about').addEventListener('click',()=>$('about-dialog').close());
$('reset-button').addEventListener('click',()=>{
  if(!confirm('Clear your saved dietary requirements and allergies on this device?'))return;
  const language=profile.language;profile={...emptyProfile(),language};sample=false;save();syncEditor();renderCard();$('form-message').textContent='Profile cleared on this device.';
});
$('export-button').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(profile,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='myfoodcard-profile.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);$('form-message').textContent='Profile exported. This file contains your food requirements; keep it private.';
});
document.querySelector('.import-label').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('import-file').click();}});
$('import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>20000)throw new Error('Choose a MyFoodCard profile smaller than 20 KB.');
    const parsed=JSON.parse(await file.text());
    if(parsed.version!==1||!Array.isArray(parsed.allergens)||!Array.isArray(parsed.diets))throw new Error('This is not a supported MyFoodCard profile.');
    const imported=cleanProfile(parsed);
    if(!confirm('Replace your saved profile with the profile from this file?'))return;
    profile=imported;sample=false;save();syncEditor();renderCard();$('form-message').textContent='Profile imported. Please review every selection.';
  }catch(error){$('form-message').textContent=error instanceof SyntaxError?'This file is not valid JSON.':error.message;}
  finally{event.target.value='';}
});
function locationMessage(text){const node=$('location-result');node.hidden=false;node.textContent=text;}
$('location-button').addEventListener('click',async()=>{
  if(!navigator.geolocation){locationMessage('Location is not supported here. Choose a language from the list.');return;}
  const button=$('location-button');button.disabled=true;locationMessage('Checking your location on this device…');
  navigator.geolocation.getCurrentPosition(async position=>{
    try{
      const response=await fetch('./countries.json');if(!response.ok)throw new Error('Map unavailable');
      const {countries}=await response.json();
      const country=countryAt(position.coords.longitude,position.coords.latitude,countries);
      if(!country){locationMessage('No reliable country match. Choose a language from the list.');return;}
      const suggestions=languageSuggestions(country.code);
      if(!suggestions.length){locationMessage('Near '+country.name+'. A local language for this country is not included yet. Choose a language the staff understands.');return;}
      locationMessage('Near '+country.name+' · choose a suggested language. This is an approximate match.');
      for(const code of suggestions){
        const choice=document.createElement('button');choice.type='button';choice.textContent=translations[code].native;
        choice.addEventListener('click',()=>{profile.language=code;save();syncEditor();renderCard();locationMessage('Card language set to '+translations[code].english+'. You can change it at any time.');});
        $('location-result').append(choice);
      }
    }catch{locationMessage('The offline map is unavailable. Connect once to download it, or choose a language yourself.');}
    finally{button.disabled=false;}
  },error=>{
    locationMessage(error.code===1?'Location permission was not granted. You can still choose a language yourself.':'Could not get a location. You can still choose a language yourself.');
    button.disabled=false;
  },{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
});
function setOfflineStatus(state,message){const node=$('offline-status');node.className='status '+state;node.innerHTML='<span class="status-dot"></span>'+escape(message);}
function networkStatus(){
  if(offlineReady)setOfflineStatus('ready',navigator.onLine?'Ready offline':'Offline · card ready');
  else if(!navigator.onLine)setOfflineStatus('problem','Connect to finish setup');
}
window.addEventListener('online',networkStatus);window.addEventListener('offline',networkStatus);
async function prepareOffline(){
  if(!('serviceWorker' in navigator)){setOfflineStatus('problem','Offline unavailable');return;}
  try{
    const registration=await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    const worker=registration.active;
    if(!worker)throw new Error('No active worker');
    const response=await new Promise((resolve,reject)=>{
      const channel=new MessageChannel();const timeout=setTimeout(()=>reject(new Error('Offline setup timed out')),15000);
      channel.port1.onmessage=event=>{clearTimeout(timeout);resolve(event.data);};
      worker.postMessage({type:'CHECK_CACHE'},[channel.port2]);
    });
    if(response.ready){offlineReady=true;networkStatus();}else throw new Error('Cache incomplete');
  }catch{setOfflineStatus('problem','Offline setup incomplete');}
}
prepareOffline();

