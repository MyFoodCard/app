import {DIETS,LANGUAGES,emptyProfile,cleanProfile,requirementCount,addIngredient,toggleItem,countrySuggestions,languageSuggestions} from './domain.js';
import {translations} from './translations.js';
import {createShareUrl,readSharedProfile} from './sharing.js';
import {cardMarkup,cardSummary} from './card.js';
import {qrSvg} from './qr.js';
import {PROFILE_KEY,LEGACY_PROFILE_KEYS,loadProfile} from './profile-storage.js';
import {bindPickerDismissal} from './picker-events.js';
import {bindSheetDismissal} from './sheet-dismiss.js';
import {bindInstallButton} from './install.js';
import {APP_LANGUAGE_KEY,initialAppLanguage,uiText,localizeDOM,localizedIngredientSearch} from './i18n.js';
const $=id=>document.getElementById(id);
bindInstallButton({window,button:$('install-button'),dialog:$('install-dialog'),closeButton:$('close-install'),steps:document.querySelectorAll('[data-install-platform]')});
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let appLanguage=initialAppLanguage({getItem:key=>localStorage.getItem(key)},navigator.languages||[navigator.language]);
const t=(key,values)=>uiText(appLanguage,key,values);
const labels=()=>translations[appLanguage];
const messages=new Map();
function message(id,key,values={}){messages.set(id,{key,values});$(id).textContent=t(key,values);}
let profile={...emptyProfile(),language:appLanguage},sample=false,sharedProfile=null,offlineReady=false;
let offlineState='',offlineKey='preparing';
try{const loaded=loadProfile(localStorage,appLanguage);profile=loaded.profile;if(loaded.saveFailed){message('save-status','notSaved');message('form-message','loadSaveFailed');}}
catch{message('form-message','loadFailed');}
const foodPickers=[];
function activeProfile(){return sharedProfile||(sample?{...profile,mustAvoid:['flaxseed'],diets:['vegan'],avoidIfPossible:[],crossContact:true}:profile);}
function buildDietOptions(){
  $('diet-options').innerHTML=DIETS.map(key=>'<label class="chip"><input type="checkbox" data-group="diets" aria-label="'+escape(labels().diets[key].label)+'" value="'+key+'"><span>'+escape(labels().diets[key].label)+'</span></label>').join('');
}
function buildOptions(){
  for(const root of document.querySelectorAll('[data-food-group]'))foodPickers.push(createIngredientPicker(root));
  const options=LANGUAGES.map(code=>'<option value="'+code+'" lang="'+code+'">'+escape(translations[code].native)+'</option>').join('');
  $('card-language').innerHTML=options;$('app-language').innerHTML=options;
}
function applyAppLanguage(){
  document.documentElement.lang=appLanguage;document.documentElement.dir=labels().dir;
  document.title='MyFoodCard · '+labels().tagline;
  document.querySelector('meta[name="description"]').content=t('intro');
  localizeDOM(document,appLanguage);
  $('app-language').value=appLanguage;
  // UI controls keep the app language even inside a differently translated card.
  $('card-controls').lang=appLanguage;$('card-controls').dir=labels().dir;
  for(const [id,{key,values}] of messages)$(id).textContent=t(key,values);
  buildDietOptions();
  setOfflineStatus(offlineState,offlineKey);
  $('location-result').hidden=true;
}
function syncEditor(){
  $('cross-contact').checked=profile.crossContact;
  $('card-language').value=activeProfile().language;
  document.querySelectorAll('[data-group]').forEach(input=>input.checked=profile[input.dataset.group].includes(input.value));
  foodPickers.forEach(picker=>picker.sync());
}
function save(){
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));message('save-status','saved');return true;}
  catch{message('save-status','notSaved');message('form-message','saveFailed');return false;}
}
function createIngredientPicker(root){
  const group=root.dataset.foodGroup,label=()=>t(group);
  const search=root.querySelector('input[type="search"]'), selected=root.querySelector('.selected-ingredients');
  const results=root.querySelector('.ingredient-results'), status=root.querySelector('[role="status"]'), browse=root.querySelector('.browse-ingredients');
  let open=false;
  function choices(){
    return localizedIngredientSearch(search.value,appLanguage).filter(key=>!profile[group].includes(key)&&(group==='mustAvoid'||!profile.mustAvoid.includes(key)));
  }
  function renderResults(){
    const keys=choices();
    results.hidden=!open||!keys.length;browse.setAttribute('aria-expanded',String(open));
    browse.textContent=t(open?'closeList':'browse');
    results.innerHTML=keys.map(key=>'<li><button type="button" data-add="'+key+'" aria-label="'+escape(t('addTo',{ingredient:labels().ingredients[key],group:label()}))+'"><span>'+escape(labels().ingredients[key])+'</span><small>'+(group==='mustAvoid'&&profile.avoidIfPossible.includes(key)?t('moved'):'＋')+'</small></button></li>').join('');
    status.textContent=open?(keys.length?t('resultsCount',{count:new Intl.NumberFormat(appLanguage).format(keys.length)}):t(search.value.trim()?'noResults':'allSelected')):'';
  }
  function sync(){
    selected.innerHTML=profile[group].map(key=>'<li><button type="button" data-remove="'+key+'" aria-label="'+escape(t('removeFrom',{ingredient:labels().ingredients[key],group:label()}))+'"><span>'+escape(labels().ingredients[key])+'</span><span aria-hidden="true">×</span></button></li>').join('');
    root.querySelector('.selection-empty').hidden=profile[group].length>0;
    renderResults();
  }
  function show(){open=true;renderResults();}
  function close(){
    // Blur can fire while result nodes are being replaced. Hide without rebuilding them.
    open=false;results.hidden=true;browse.setAttribute('aria-expanded','false');
    browse.textContent=t('browse');status.textContent='';
  }
  function add(key,returnFocus=false){
    profile=addIngredient(profile,group,key);search.value='';
    foodPickers.forEach(picker=>picker.sync());edit();
    if(returnFocus)search.focus({preventScroll:true});else{search.blur();close();}
    status.textContent=t('added',{ingredient:labels().ingredients[key],group:label()});
  }
  search.addEventListener('focus',show);
  search.addEventListener('input',show);
  search.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){event.preventDefault();show();results.querySelector('button')?.focus();}
    if(event.key==='Enter'){event.preventDefault();const keys=choices();if(keys.length===1)add(keys[0],true);else show();}
    if(event.key==='Escape'){event.preventDefault();close();}
  });
  browse.addEventListener('click',()=>{if(open)close();else{search.value='';show();}});
  results.addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(button)add(button.dataset.add,event.detail===0);});
  results.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();search.focus();close();return;}
    if(!['ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();const buttons=[...results.querySelectorAll('button')],index=buttons.indexOf(event.target);
    buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
  });
  selected.addEventListener('click',event=>{
    const button=event.target.closest('[data-remove]');if(!button)return;
    const key=button.dataset.remove;profile[group]=profile[group].filter(item=>item!==key);
    foodPickers.forEach(picker=>picker.sync());edit();
    if(event.detail===0)search.focus({preventScroll:true});else{search.blur();close();}
    status.textContent=t('removed',{ingredient:labels().ingredients[key],group:label()});
  });
  bindPickerDismissal(root,close);
  return {sync,close};
}
function renderCard(){
  const p=activeProfile(),count=requirementCount(p);
  $('sample-banner').hidden=!sample;
  $('shared-banner').hidden=!sharedProfile;
  document.body.classList.toggle('viewing-shared',Boolean(sharedProfile));
  $('location-button').hidden=Boolean(sharedProfile);
  message('share-status','sharePrivacy');
  $('selected-count').textContent=count;
  $('selected-count').hidden=!count;
  $('present-button').disabled=!count;$('copy-text-button').disabled=!count;$('share-button').disabled=!count;
  if($('present-dialog').open){if(count)renderPresentation();else $('present-dialog').close();}
}
function edit(){sample=false;save();renderCard();}
buildOptions();applyAppLanguage();syncEditor();renderCard();
$('app-language').addEventListener('change',event=>{
  appLanguage=event.target.value;
  try{localStorage.setItem(APP_LANGUAGE_KEY,appLanguage);}catch{}
  applyAppLanguage();syncEditor();renderCard();
});
function loadSharedLink(){
  // The skip link can change the anchor while keeping the shared card open.
  if(window.location.hash==='#main')return;
  sample=false;
  $('link-message').hidden=true;
  try{sharedProfile=readSharedProfile(window.location.hash);}
  catch(error){sharedProfile=null;message('link-message','invalidLink');$('link-message').hidden=false;}
  if(!sharedProfile&&$('present-dialog').open)$('present-dialog').close();
  syncEditor();renderCard();
  if(sharedProfile)showRestaurantCard();
}
loadSharedLink();
window.addEventListener('hashchange',loadSharedLink);
function leaveSharedCard(){
  sharedProfile=null;sample=false;
  const url=new URL(window.location.href);url.hash='';window.history.replaceState(null,'',url);
  $('link-message').hidden=true;$('location-result').hidden=true;
  syncEditor();renderCard();
}
$('exit-shared').addEventListener('click',()=>$('present-dialog').close());
$('use-shared').addEventListener('click',()=>{
  if(!sharedProfile)return;
  profile=cleanProfile(sharedProfile);save();leaveSharedCard();$('present-dialog').close();
});
$('share-button').addEventListener('click',async()=>{
  const url=createShareUrl(activeProfile(),new URL('./',window.location.href).href);
  try{
    await navigator.clipboard.writeText(url);
    message('share-status','linkCopied');
  }catch{
    $('share-url').value=url;$('share-dialog').showModal();$('share-url').focus();$('share-url').select();
  }
});
$('close-share').addEventListener('click',()=>$('share-dialog').close());
$('diet-options').addEventListener('change',event=>{
  const input=event.target;if(input.dataset.group!=='diets')return;
  profile.diets=toggleItem(profile.diets,input.value,input.checked);edit();
});
$('cross-contact').addEventListener('change',event=>{profile.crossContact=event.target.checked;edit();});
function setCardLanguage(code){
  if(sharedProfile)sharedProfile.language=code;else{profile.language=code;save();}
  $('card-language').value=code;renderCard();$('location-result').hidden=true;
}
$('card-language').addEventListener('change',event=>setCardLanguage(event.target.value));
$('sample-button').addEventListener('click',()=>{sample=true;renderCard();showRestaurantCard();});
$('exit-sample').addEventListener('click',()=>$('present-dialog').close());
function renderPresentation(){
  const p=activeProfile(),t=translations[p.language],controls=$('card-controls');
  $('present-card').innerHTML='<article id="food-card" class="food-card" lang="'+p.language+'" dir="'+t.dir+'">'+cardMarkup(p,sample,createShareUrl(p,new URL('./',window.location.href).href),appLanguage)+'</article>';
  $('present-card').querySelector('.card-lang').replaceWith(controls);
  $('card-language').value=p.language;
}
function showRestaurantCard(){
  if(!requirementCount(activeProfile()))return;
  renderPresentation();
  if(!$('present-dialog').open)$('present-dialog').showModal();
}
$('present-button').addEventListener('click',showRestaurantCard);
$('close-present').addEventListener('click',()=>$('present-dialog').close());
bindSheetDismissal($('present-dialog'),$('card-drag-handle'));
$('present-dialog').addEventListener('close',()=>{
  if(sharedProfile)leaveSharedCard();
  if(sample){sample=false;syncEditor();renderCard();}
});
$('copy-text-button').addEventListener('click',async()=>{
  const p=activeProfile(),text=cardSummary(p);
  try{
    await navigator.clipboard.writeText(text);
    message('share-status','textCopied',{language:translations[p.language].native});
  }catch{
    const field=$('summary-text');field.value=text;field.lang=p.language;field.dir=translations[p.language].dir;
    $('text-dialog').showModal();field.focus();field.select();
  }
});
$('close-text').addEventListener('click',()=>$('text-dialog').close());
$('present-card').addEventListener('click',event=>{
  if(!event.target.closest('.card-qr'))return;
  $('large-qr').innerHTML=qrSvg(createShareUrl(activeProfile(),new URL('./',window.location.href).href));
  $('qr-dialog').showModal();
});
$('close-qr').addEventListener('click',()=>$('qr-dialog').close());
$('about-button').addEventListener('click',()=>$('about-dialog').showModal());
$('close-about').addEventListener('click',()=>$('about-dialog').close());
$('reset-button').addEventListener('click',()=>{
  if(!confirm(t('clearConfirm')))return;
  const language=profile.language;profile={...emptyProfile(),language};sample=false;
  const saved=save();syncEditor();renderCard();foodPickers.forEach(picker=>picker.close());
  if(saved){
    try{for(const key of LEGACY_PROFILE_KEYS)localStorage.removeItem(key);message('form-message','cleared');}
    catch{message('form-message','clearFailed');}
  }
});
$('export-button').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(profile,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='myfoodcard-profile.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);message('form-message','exported');
});
document.querySelector('.import-label').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('import-file').click();}});
$('import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>20000)throw new Error('fileLarge');
    const parsed=JSON.parse(await file.text());
    if(!parsed||![1,2,3].includes(parsed.version)||!Array.isArray(parsed.diets))throw new Error('unsupportedProfile');
    const imported=cleanProfile(parsed);
    if(!confirm(t('replaceConfirm')))return;
    profile=imported;sample=false;const saved=save();syncEditor();renderCard();foodPickers.forEach(picker=>picker.close());
    if(saved)message('form-message','imported');
  }catch(error){message('form-message',error instanceof SyntaxError?'invalidJson':error.message==='fileLarge'?'fileLarge':'unsupportedProfile');}
  finally{event.target.value='';}
});
function locationMessage(key,values={}){$('location-result').hidden=false;message('location-result',key,values);}
$('location-button').addEventListener('click',async()=>{
  if(!navigator.geolocation){locationMessage('locationUnsupported');return;}
  const button=$('location-button');button.disabled=true;locationMessage('locating');
  navigator.geolocation.getCurrentPosition(async position=>{
    try{
      const response=await fetch('./countries.json');if(!response.ok)throw new Error('Map unavailable');
      const {countries}=await response.json();
      const matches=countrySuggestions(position.coords.longitude,position.coords.latitude,countries);
      if(!matches.length){locationMessage('noLocationMatch');return;}
      const suggestions=[...new Set(matches.flatMap(({country})=>languageSuggestions(country.code)))];
      const names=matches.map(({country})=>country.name).join(' / ');
      if(!suggestions.length){locationMessage('unsupportedCountry',{countries:names});return;}
      locationMessage(matches[0].approximate?'locationApprox':'locationMatch',{countries:names});
      if(position.coords.accuracy>10000)$('location-result').append(document.createTextNode(' '+t('lowAccuracy')));
      for(const code of suggestions){
        const choice=document.createElement('button');choice.type='button';choice.textContent=translations[code].native;
        choice.addEventListener('click',()=>{setCardLanguage(code);locationMessage('languageSet',{language:translations[code].native});});
        $('location-result').append(choice);
      }
    }catch{locationMessage('mapUnavailable');}
    finally{button.disabled=false;}
  },error=>{
    locationMessage(error.code===1?'locationDenied':'locationFailed');
    button.disabled=false;
  },{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
});
function setOfflineStatus(state,key){offlineState=state;offlineKey=key;const node=$('offline-status');node.className='status '+state;node.innerHTML='<span class="status-dot"></span>'+escape(t(key));}
function networkStatus(){
  if(offlineReady)setOfflineStatus('ready',navigator.onLine?'readyOffline':'offlineReady');
  else if(!navigator.onLine)setOfflineStatus('problem','connectSetup');
}
window.addEventListener('online',networkStatus);window.addEventListener('offline',networkStatus);
async function prepareOffline(){
  if(!('serviceWorker' in navigator)){setOfflineStatus('problem','offlineUnavailable');return;}
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
  }catch{setOfflineStatus('problem','offlineIncomplete');}
}
prepareOffline();

