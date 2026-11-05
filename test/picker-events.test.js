import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPickerDismissal} from '../dist/picker-events.js';

function setup(){
  const document=new EventTarget(),root=new EventTarget(),search=new EventTarget(),result=new EventTarget(),outside=new EventTarget();
  root.ownerDocument=document;
  root.contains=node=>[root,search,result].includes(node);
  let open=true;
  bindPickerDismissal(root,()=>{open=false;});
  return {document,root,search,result,outside,isOpen:()=>open};
}
function dispatch(surface,type,target,properties={}){
  const event=new Event(type);
  for(const [key,value] of Object.entries({target,...properties}))Object.defineProperty(event,key,{value});
  surface.dispatchEvent(event);
}

test('a tap can blur search without a focus destination before activating a result',()=>{
  const ui=setup();let added=false;
  ui.result.addEventListener('click',()=>{added=true;});
  dispatch(ui.document,'pointerdown',ui.result);
  dispatch(ui.root,'focusout',ui.search,{relatedTarget:null});
  assert.equal(ui.isOpen(),true,'the result must stay visible until the tap activates it');
  dispatch(ui.result,'click',ui.result);
  assert.equal(added,true);
});

test('dismissal follows the actual focus or pointer destination outside the picker',()=>{
  for(const type of ['focusin','pointerdown']){
    const ui=setup();
    dispatch(ui.document,type,ui.search);assert.equal(ui.isOpen(),true);
    dispatch(ui.document,type,ui.result);assert.equal(ui.isOpen(),true);
    dispatch(ui.document,type,ui.outside);assert.equal(ui.isOpen(),false,type);
  }
});
