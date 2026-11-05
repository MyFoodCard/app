import {COMMON_ALLERGENS,MORE_ALLERGENS,INGREDIENTS,DIETS,LANGUAGES,emptyProfile,cleanProfile,requirementCount,toggleItem,countryAt,languageSuggestions} from './domain.js';
import {translations} from './translations.js';
import {createShareUrl,readSharedProfile} from './sharing.js';
import {cardMarkup} from './card.js';
import {PROFILE_KEY,loadProfile} from './profile-storage.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let profile=emptyProfile(), sample=false, sharedProfile=null, offlineReady=false;
try{const loaded=loadProfile(localStorage);profile=loaded.profile;if(loaded.saveFailed){$('save-status').textContent='Not saved';$('form-message').textContent='Your previous profile was loaded, but this browser cannot save the updated profile. Export it to keep a copy.';}}
catch{$('form-message').textContent='Saved data could not be read. It has not been changed. Import a supported backup or create a new profile below.';}
const english=translations.en;
function activeProfile(){return sharedProfile||(sample?{...profile,allergens:['flaxseed'],diets:['vegan'],intolerances:[],crossContact:true}:profile);}
function buildOptions(){
  for(const [type,keys,root] of [['diets',DIETS,'diet-options'],['allergens',COMMON_ALLERGENS,'allergen-options'],['allergens',MORE_ALLERGENS,'more-allergen-options']]){
    $(root).innerHTML=keys.map(key=>'<label class="chip"><input type="checkbox" data-group="'+type+'" aria-label="'+escape(type==='diets'?english.diets[key].label:english.allergens[key])+'" value="'+key+'"><span>'+escape(type==='diets'?english.diets[key].label:english.allergens[key])+'</span></label>').join('');
  }
  $('card-language').innerHTML=LANGUAGES.map(code=>'<option value="'+code+'">'+escape(translations[code].native)+' · '+escape(translations[code].english)+'</option>').join('');
}
function syncEditor(){
  $('cross-contact').checked=profile.crossContact;
  $('card-language').value=activeProfile().language;
  document.querySelectorAll('[data-group]').forEach(input=>input.checked=profile[input.dataset.group].includes(input.value));
  if(profile.allergens.some(key=>MORE_ALLERGENS.includes(key)))$('more-allergens').open=true;
  filterAllergens();renderIntoleranceEditor();
}
function save(){
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));$('save-status').textContent='Saved on device';return true;}
  catch{$('save-status').textContent='Not saved';$('form-message').textContent='This browser cannot save your profile. Export it to keep a copy.';return false;}
}
function filterAllergens(){
  const query=$('allergen-search').value.trim().toLowerCase();let matches=0,moreMatches=0;
  document.querySelectorAll('[data-group="allergens"]').forEach(input=>{
    const match=english.allergens[input.value].toLowerCase().includes(query);
    input.closest('.chip').hidden=!match;
    if(match){matches++;if(MORE_ALLERGENS.includes(input.value))moreMatches++;}
  });
  if(query&&moreMatches)$('more-allergens').open=true;
  $('more-allergens').hidden=Boolean(query&&!moreMatches);
  const selected=profile.allergens.filter(key=>MORE_ALLERGENS.includes(key)).length;
  $('more-allergens-label').textContent='More allergens'+(selected?' · '+selected+' selected':'');
  $('allergen-search-status').textContent=query?(matches?matches+' matching choices':'No matching allergen. This list is not exhaustive.'):'';
}
function renderIntoleranceEditor(){
  const selected=$('intolerance-ingredient').value;
  const keys=[...INGREDIENTS].sort((a,b)=>english.ingredients[a].localeCompare(english.ingredients[b],'en'));
  $('intolerance-ingredient').innerHTML='<option value="">Choose an ingredient…</option>'+keys.map(key=>'<option value="'+key+'"'+(profile.allergens.includes(key)||profile.intolerances.some(item=>item.ingredient===key)?' disabled':'')+'>'+escape(english.ingredients[key])+'</option>').join('');
  if(selected&&!profile.allergens.includes(selected)&&!profile.intolerances.some(item=>item.ingredient===selected))$('intolerance-ingredient').value=selected;
  $('add-intolerance').disabled=!$('intolerance-ingredient').value;
  $('intolerance-list').innerHTML=profile.intolerances.map(item=>'<li class="intolerance-row"><label for="avoid-'+item.ingredient+'">'+escape(english.ingredients[item.ingredient])+'</label><select id="avoid-'+item.ingredient+'" data-avoidance="'+item.ingredient+'" aria-label="Avoidance for '+escape(english.ingredients[item.ingredient])+'"><option value="must"'+(item.avoidance==='must'?' selected':'')+'>Must avoid</option><option value="prefer"'+(item.avoidance==='prefer'?' selected':'')+'>Avoid if possible</option></select><button class="text-button" data-remove-intolerance="'+item.ingredient+'" aria-label="Remove '+escape(english.ingredients[item.ingredient])+' intolerance">Remove</button></li>').join('');
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
document.querySelectorAll('[data-group]').forEach(input=>input.addEventListener('change',()=>{
  const group=input.dataset.group;profile[group]=toggleItem(profile[group],input.value,input.checked);
  if(group==='allergens'){
    const overlap=input.checked&&profile.intolerances.some(item=>item.ingredient===input.value);
    if(overlap){profile.intolerances=profile.intolerances.filter(item=>item.ingredient!==input.value);$('intolerance-status').textContent=english.ingredients[input.value]+' is now shown as an allergy. Its intolerance entry was removed.';}
    renderIntoleranceEditor();filterAllergens();
  }
  edit();
}));
$('allergen-search').addEventListener('input',filterAllergens);
$('intolerance-ingredient').addEventListener('change',()=>$('add-intolerance').disabled=!$('intolerance-ingredient').value);
$('add-intolerance').addEventListener('click',()=>{
  const ingredient=$('intolerance-ingredient').value;
  if(!INGREDIENTS.includes(ingredient)||profile.allergens.includes(ingredient)||profile.intolerances.some(item=>item.ingredient===ingredient))return;
  profile.intolerances.push({ingredient,avoidance:'must'});
  $('intolerance-status').textContent=english.ingredients[ingredient]+' added as “Must avoid”. You can change the instruction below.';
  renderIntoleranceEditor();edit();$('avoid-'+ingredient).focus();
});
$('intolerance-list').addEventListener('change',event=>{
  const ingredient=event.target.dataset.avoidance;
  const item=profile.intolerances.find(item=>item.ingredient===ingredient);
  if(item&&['must','prefer'].includes(event.target.value)){
    item.avoidance=event.target.value;
    $('intolerance-status').textContent=english.ingredients[ingredient]+' set to “'+(item.avoidance==='must'?'Must avoid':'Avoid if possible')+'”.';
    edit();
  }
});
$('intolerance-list').addEventListener('click',event=>{
  const button=event.target.closest('[data-remove-intolerance]');if(!button)return;
  const ingredient=button.dataset.removeIntolerance;
  profile.intolerances=profile.intolerances.filter(item=>item.ingredient!==ingredient);
  $('intolerance-status').textContent=english.ingredients[ingredient]+' removed.';
  renderIntoleranceEditor();edit();$('intolerance-ingredient').focus();
});
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
  if(!confirm('Clear your saved dietary requirements, allergies and intolerances on this device?'))return;
  const language=profile.language;profile={...emptyProfile(),language};sample=false;
  const saved=save();syncEditor();renderCard();$('intolerance-status').textContent='';
  if(saved){
    try{localStorage.removeItem('myfoodcard.profile.v1');$('form-message').textContent='Profile cleared on this device.';}
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
    if(!parsed||![1,2].includes(parsed.version)||!Array.isArray(parsed.allergens)||!Array.isArray(parsed.diets))throw new Error('This is not a supported MyFoodCard profile.');
    const imported=cleanProfile(parsed);
    if(!confirm('Replace your saved profile with the profile from this file?'))return;
    profile=imported;sample=false;const saved=save();syncEditor();renderCard();$('intolerance-status').textContent='';
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

