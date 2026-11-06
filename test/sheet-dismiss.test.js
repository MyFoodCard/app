import test from 'node:test';
import assert from 'node:assert/strict';
import {bindSheetDismissal} from '../dist/sheet-dismiss.js';

function setup(){
  const handle=new EventTarget(),dialog=new EventTarget(),content=new EventTarget();
  const styles=new Map(),classes=new Set(),captures=new Set();
  dialog.open=true;dialog.closes=0;
  dialog.close=()=>{dialog.open=false;dialog.closes++;dialog.dispatchEvent(new Event('close'));};
  dialog.style={setProperty:(key,value)=>styles.set(key,value),removeProperty:key=>styles.delete(key)};
  dialog.classList={add:key=>classes.add(key),remove:key=>classes.delete(key)};
  handle.setPointerCapture=id=>captures.add(id);
  handle.hasPointerCapture=id=>captures.has(id);
  handle.releasePointerCapture=id=>captures.delete(id);
  const send=(type,properties={},target=handle)=>{
    const event=new Event(type,{cancelable:true});
    for(const [key,value] of Object.entries({pointerId:1,isPrimary:true,button:0,clientX:100,clientY:100,detail:1,...properties}))Object.defineProperty(event,key,{value});
    target.dispatchEvent(event);
    return event;
  };
  bindSheetDismissal(dialog,handle);
  return {dialog,handle,content,styles,classes,captures,send};
}

test('a downward handle drag closes on release and does not also click',()=>{
  const ui=setup();
  ui.send('pointerdown');ui.send('pointermove',{clientY:200});
  assert.equal(ui.dialog.open,true);
  assert.equal(ui.styles.get('--sheet-drag'),'100px');
  ui.send('pointerup',{clientY:200});ui.send('click');
  assert.equal(ui.dialog.closes,1);
  assert.equal(ui.styles.size,0);assert.equal(ui.captures.size,0);assert.equal(ui.classes.size,0);
});
test('short, upward, horizontal and reversed drags leave the card open',()=>{
  for(const [clientX,clientY] of [[100,145],[100,20],[240,200],[100,100]]){
    const ui=setup();
    ui.send('pointerdown');ui.send('pointermove',{clientY:200});
    ui.send('pointermove',{clientX,clientY});ui.send('pointerup',{clientX,clientY});
    assert.equal(ui.send('click').defaultPrevented,true);
    assert.equal(ui.dialog.open,true);assert.equal(ui.styles.size,0);
  }
});
test('cancellation and lost capture reset a drag without dismissing',()=>{
  for(const type of ['pointercancel','lostpointercapture']){
    const ui=setup();
    ui.send('pointerdown');ui.send('pointermove',{clientY:200});ui.send(type);
    ui.send('pointerup',{clientY:200});ui.send('click');
    assert.equal(ui.dialog.open,true);assert.equal(ui.styles.size,0);assert.equal(ui.captures.size,0);
  }
});
test('a tap or keyboard activation closes, including after a cancelled drag',()=>{
  for(const detail of [0,1]){
    const ui=setup();
    ui.send('pointerdown');ui.send('pointermove',{clientY:140});ui.send('pointercancel');
    if(detail===1){ui.send('pointerdown');ui.send('pointerup');}
    ui.send('click',{detail});
    assert.equal(ui.dialog.closes,1);
  }
});
test('content scrolling and secondary pointers cannot dismiss the card',()=>{
  const ui=setup();
  ui.send('pointerdown',{},ui.content);ui.send('pointerup',{clientY:250},ui.content);
  assert.equal(ui.dialog.open,true);
  ui.send('pointerdown');ui.send('pointermove',{clientY:200});
  ui.send('pointerdown',{pointerId:2,isPrimary:false});
  ui.send('pointerup',{clientY:200});ui.send('click');
  assert.equal(ui.dialog.open,true);assert.equal(ui.styles.size,0);
});
test('Escape cancels an active drag before the native dialog closes',()=>{
  const ui=setup();
  ui.send('pointerdown');ui.send('pointermove',{clientY:200});
  ui.dialog.dispatchEvent(new Event('cancel'));ui.dialog.close();
  ui.send('pointerup',{clientY:220});ui.send('click');
  assert.equal(ui.dialog.closes,1);assert.equal(ui.styles.size,0);
});
