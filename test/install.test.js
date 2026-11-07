import test from 'node:test';
import assert from 'node:assert/strict';
import {installPlatform,bindInstallButton} from '../dist/install.js';

class Target{
  listeners=new Map();
  addEventListener(name,callback){this.listeners.set(name,[...(this.listeners.get(name)||[]),callback]);}
  async emit(name,event={}){await Promise.all((this.listeners.get(name)||[]).map(fn=>fn(event)));}
}
function setup(navigator={},installed=false){
  const window=new Target(),button=new Target(),closeButton=new Target(),media=new Target();
  media.matches=installed;window.navigator=navigator;window.matchMedia=()=>media;
  const dialog={open:false,opens:0,showModal(){this.open=true;this.opens++;},close(){this.open=false;}};
  const steps=['ios','mac','other'].map(platform=>({dataset:{installPlatform:platform},hidden:true}));
  bindInstallButton({window,button,dialog,closeButton,steps});
  return {window,button,dialog,closeButton,media,steps};
}
const iphone={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'};
const mac={userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:0};

test('install help recognizes iPhone, desktop-mode iPad and Safari on Mac',()=>{
  assert.equal(installPlatform(iphone),'ios');
  assert.equal(installPlatform({...mac,maxTouchPoints:5}),'ios');
  assert.equal(installPlatform(mac),'mac');
  assert.equal(installPlatform({...mac,userAgent:mac.userAgent+' Chrome/130.0'}),'other');
  assert.equal(installPlatform({userAgent:'Mozilla/5.0 (Linux; Android 15) Chrome/130.0 Mobile Safari/537.36'}),'other');
  assert.equal(installPlatform({}),'other');
});

test('unsupported prompt APIs show only the relevant help on request, and help can close',async()=>{
  for(const [navigator,platform] of [[iphone,'ios'],[mac,'mac'],[{},'other']]){
    const app=setup(navigator);
    assert.equal(app.button.hidden,false);assert.equal(app.dialog.open,false);
    await app.button.emit('click');
    assert.equal(app.dialog.open,true);
    assert.deepEqual(app.steps.filter(step=>!step.hidden).map(step=>step.dataset.installPlatform),[platform]);
    await app.closeButton.emit('click');assert.equal(app.dialog.open,false);
  }
});

test('native install prompts require a click and dismissed prompts are consumed once',async()=>{
  const app=setup();let calls=0,prevented=0;
  await app.window.emit('beforeinstallprompt',{preventDefault(){prevented++;},async prompt(){calls++;return {outcome:'dismissed'};}});
  assert.equal(prevented,1);assert.equal(calls,0);assert.equal(app.dialog.open,false);
  await app.button.emit('click');
  assert.equal(calls,1);assert.equal(app.dialog.open,false);assert.equal(app.button.hidden,false);assert.equal(app.button.disabled,false);
  await app.button.emit('click');assert.equal(calls,1);assert.equal(app.dialog.open,true);
  await app.closeButton.emit('click');
  await app.window.emit('beforeinstallprompt',{preventDefault(){},async prompt(){calls++;}});
  await app.button.emit('click');assert.equal(calls,2);
});

test('repeated clicks cannot overlap a native prompt, and acceptance alone does not claim installation',async()=>{
  const app=setup();let finish,calls=0;
  await app.window.emit('beforeinstallprompt',{preventDefault(){},prompt(){calls++;return new Promise(resolve=>{finish=resolve;});}});
  const pending=app.button.emit('click');
  assert.equal(app.button.disabled,true);
  await app.button.emit('click');assert.equal(calls,1);assert.equal(app.dialog.open,false);
  finish({outcome:'accepted'});await pending;
  assert.equal(app.button.disabled,false);assert.equal(app.button.hidden,false);
  await app.window.emit('appinstalled');assert.equal(app.button.hidden,true);
});

test('failed native prompts fall back to help and leave the button usable',async()=>{
  const app=setup();
  await app.window.emit('beforeinstallprompt',{preventDefault(){},async prompt(){throw Error('No longer available');}});
  await app.button.emit('click');
  assert.equal(app.dialog.open,true);assert.equal(app.button.disabled,false);
});

test('standalone launch, display changes and installation events hide the action and close help',async()=>{
  assert.equal(setup({},true).button.hidden,true);
  const ios=setup({...iphone,standalone:true});assert.equal(ios.button.hidden,true);
  await ios.button.emit('click');assert.equal(ios.dialog.open,false);
  const app=setup();await app.button.emit('click');assert.equal(app.dialog.open,true);
  app.media.matches=true;await app.media.emit('change');
  assert.equal(app.button.hidden,true);assert.equal(app.dialog.open,false);
  app.media.matches=false;await app.media.emit('change');assert.equal(app.button.hidden,false);
  await app.button.emit('click');await app.window.emit('appinstalled');
  assert.equal(app.button.hidden,true);assert.equal(app.dialog.open,false);
  await app.window.emit('pageshow');assert.equal(app.button.hidden,true);
});
