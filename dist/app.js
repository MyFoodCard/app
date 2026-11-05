import {DIETS,LANGUAGES,emptyProfile,cleanProfile,requirementCount,searchIngredients,addIngredient,toggleItem,countryAt,languageSuggestions} from './domain.js';
import {translations} from './translations.js';
import {createShareUrl,readSharedProfile} from './sharing.js';
import {cardMarkup} from './card.js';
import {PROFILE_KEY,LEGACY_PROFILE_KEYS,loadProfile} from './profile-storage.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let profile=emptyProfile(), sample=false, sharedProfile=null, offlineReady=false;
try{const loaded=loadProfile(localStorage);profile=loaded.profile;if(loaded.saveFailed){$('save-status').textContent='Not saved';$('form-message').textContent='Your previous profile was loaded, but this browser cannot save the updated profile. Export it to keep a copy.';}}
catch{$('form-message').textContent='Saved data could not be read. It has not been changed. Import a supported backup or create a new profile below.';}
const english=translations.en;
const foodPickers=[];
function activeProfile(){return sharedProfile||(sample?{...profile,mustAvoid:['flaxseed'],diets:['vegan'],avoidIfPossible:[],crossContact:true}:profile);}
function buildOptions(){
  $('diet-options').innerHTML=DIETS.map(key=>'<label class="chip"><input type="checkbox" data-group="diets" aria-label="'+escape(english.diets[key].label)+'" value="'+key+'"><span>'+escape(english.diets[key].label)+'</span></label>').join('');
  for(const root of document.querySelectorAll('[data-food-group]'))foodPickers.push(createIngredientPicker(root));
  $('card-language').innerHTML=LANGUAGES.map(code=>'<option value="'+code+'">'+escape(translations[code].native)+' · '+escape(translations[code].english)+'</option>').join('');
}
function syncEditor(){
  $('cross-contact').checked=profile.crossContact;
  $('card-language').value=activeProfile().language;
  document.querySelectorAll('[data-group]').forEach(input=>input.checked=profile[input.dataset.group].includes(input.value));
  foodPickers.forEach(picker=>picker.sync());
}
function save(){
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));$('save-status').textContent='Saved on device';return true;}
  catch{$('save-status').textContent='Not saved';$('form-message').textContent='This browser cannot save your profile. Export it to keep a copy.';return false;}
}
function createIngredientPicker(root){
  const group=root.dataset.foodGroup, label=group==='mustAvoid'?'Must avoid':'Avoid if possible';
  const search=root.querySelector('input[type="search"]'), selected=root.querySelector('.selected-ingredients');
  const results=root.querySelector('.ingredient-results'), status=root.querySelector('[role="status"]'), browse=root.querySelector('.browse-ingredients');
  let open=false;
  function choices(){
    return searchIngredients(search.value,english.ingredients).filter(key=>!profile[group].includes(key)&&(group==='mustAvoid'||!profile.mustAvoid.includes(key)));
  }
  function renderResults(){
    const keys=choices();
    results.hidden=!open||!keys.length;browse.setAttribute('aria-expanded',String(open));
    browse.textContent=open?'Close list':'Browse all';
    results.innerHTML=keys.map(key=>'<li><button type="button" data-add="'+key+'" aria-label="Add '+escape(english.ingredients[key])+' to '+label+'"><span>'+escape(english.ingredients[key])+'</span><small>'+(group==='mustAvoid'&&profile.avoidIfPossible.includes(key)?'Move here':'＋')+'</small></button></li>').join('');
    status.textContent=open?(keys.length?keys.length+(keys.length===1?' ingredient available':' ingredients available'):search.value.trim()?'No ingredients to add. Try another name or check your selected items.':'All ingredients are already selected.') : '';
  }
  function sync(){
    selected.innerHTML=profile[group].map(key=>'<li><button type="button" data-remove="'+key+'" aria-label="Remove '+escape(english.ingredients[key])+' from '+label+'"><span>'+escape(english.ingredients[key])+'</span><span aria-hidden="true">×</span></button></li>').join('');
    root.querySelector('.selection-empty').hidden=profile[group].length>0;
    renderResults();
  }
  function show(){open=true;renderResults();}
  function close(){
    // Blur can fire while result nodes are being replaced. Hide without rebuilding them.
    open=false;results.hidden=true;browse.setAttribute('aria-expanded','false');
    browse.textContent='Browse all';status.textContent='';
  }
  function add(key){
    profile=addIngredient(profile,group,key);search.value='';
    foodPickers.forEach(picker=>picker.sync());edit();search.focus();
    status.textContent=english.ingredients[key]+' added to '+label+'.';
  }
  search.addEventListener('focus',show);
  search.addEventListener('input',show);
  search.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){event.preventDefault();show();results.querySelector('button')?.focus();}
    if(event.key==='Enter'){event.preventDefault();const keys=choices();if(keys.length===1)add(keys[0]);else show();}
    if(event.key==='Escape'){event.preventDefault();close();}
  });
  browse.addEventListener('click',()=>{if(open)close();else{search.value='';show();search.focus();}});
  results.addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(button)add(button.dataset.add);});
  results.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();search.focus();close();return;}
    if(!['ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();const buttons=[...results.querySelectorAll('button')],index=buttons.indexOf(event.target);
    buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
  });
  selected.addEventListener('click',event=>{
    const button=event.target.closest('[data-remove]');if(!button)return;
    const key=button.dataset.remove;profile[group]=profile[group].filter(item=>item!==key);
    foodPickers.forEach(picker=>picker.sync());edit();search.focus();
    status.textContent=english.ingredients[key]+' removed from '+label+'.';
  });
  root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))close();});
  document.addEventListener('pointerdown',event=>{if(!root.contains(event.target))close();});
  return {sync,close};
}
function renderCard(){
  const p=activeProfile(),t=translations[p.language];
  $('food-card').innerHTML=cardMarkup(p,sample);
  $('food-card').lang=p.language;$('food-card').dir=t.dir;
  $('sample-banner').hidden=!sample;
  $('shared-banner').hidden=!sharedProfile;
  document.body.classList.toggle('viewing-shared',Boolean(sharedProfile));
  $('location-button').hidden=Boolean(sharedProfile);
  $('share-status').textContent='Anyone with the link can read the shared preferences.';
  const count=requirementCount(p);
  $('selected-count').textContent=count?count+' selected':'Your personal card';
  $('present-button').disabled=!count;$('print-button').disabled=!count;$('share-button').disabled=!count;
  $('sample-button')?.addEventListener('click',()=>{sample=true;renderCard();});
}
function edit(){sample=false;save();renderCard();}
buildOptions();syncEditor();renderCard();
function loadSharedLink(){
  // The skip link can change the anchor while keeping the shared card open.
  if(window.location.hash==='#main')return;
  sample=false;
  $('link-message').hidden=true;
  try{sharedProfile=readSharedProfile(window.location.hash);}
  catch(error){sharedProfile=null;$('link-message').textContent=error.message+' Your saved preferences have not changed.';$('link-message').hidden=false;}
  syncEditor();renderCard();
  if(sharedProfile||!$('link-message').hidden)viewCard(true);
}
loadSharedLink();
window.addEventListener('hashchange',loadSharedLink);
function leaveSharedCard(){
  sharedProfile=null;sample=false;
  const url=new URL(window.location.href);url.hash='';window.history.replaceState(null,'',url);
  $('link-message').hidden=true;$('location-result').hidden=true;
  syncEditor();renderCard();
}
$('exit-shared').addEventListener('click',()=>{leaveSharedCard();viewCard(false);});
$('use-shared').addEventListener('click',()=>{
  if(!sharedProfile)return;
  profile=cleanProfile(sharedProfile);save();leaveSharedCard();viewCard(true);
});
$('share-button').addEventListener('click',async()=>{
  const url=createShareUrl(activeProfile(),new URL('./',window.location.href).href);
  try{
    await navigator.clipboard.writeText(url);
    $('share-status').textContent='Link copied. It contains this card’s current preferences and language.';
  }catch{
    $('share-url').value=url;$('share-dialog').showModal();$('share-url').focus();$('share-url').select();
  }
});
$('close-share').addEventListener('click',()=>$('share-dialog').close());
document.querySelectorAll('[data-group="diets"]').forEach(input=>input.addEventListener('change',()=>{
  profile.diets=toggleItem(profile.diets,input.value,input.checked);edit();
}));
$('cross-contact').addEventListener('change',event=>{profile.crossContact=event.target.checked;edit();});
$('card-language').addEventListener('change',event=>{if(sharedProfile)sharedProfile.language=event.target.value;else{profile.language=event.target.value;save();}renderCard();$('location-result').hidden=true;});
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
  if(!confirm('Clear your saved dietary requirements and ingredients on this device?'))return;
  const language=profile.language;profile={...emptyProfile(),language};sample=false;
  const saved=save();syncEditor();renderCard();foodPickers.forEach(picker=>picker.close());
  if(saved){
    try{for(const key of LEGACY_PROFILE_KEYS)localStorage.removeItem(key);$('form-message').textContent='Profile cleared on this device.';}
    catch{$('form-message').textContent='The current profile was cleared, but an older backup could not be removed. Clear this site’s browser data to remove it.';}
  }
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
    if(!parsed||![1,2,3].includes(parsed.version)||!Array.isArray(parsed.diets))throw new Error('This is not a supported MyFoodCard profile.');
    const imported=cleanProfile(parsed);
    if(!confirm('Replace your saved profile with the profile from this file?'))return;
    profile=imported;sample=false;const saved=save();syncEditor();renderCard();foodPickers.forEach(picker=>picker.close());
    if(saved)$('form-message').textContent='Profile imported. Please review every selection.';
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

