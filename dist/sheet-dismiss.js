// Delegate to the full header, including headers replaced after a language change.
// Form controls keep their native behavior; the card body retains native scrolling.
export function bindSheetDismissal(dialog,handle){
  let start=null,suppressClick=false;
  function reset(){
    const pointerId=start?.id,capture=start?.capture;
    start=null;
    dialog.style.removeProperty('--sheet-drag');
    dialog.classList.remove('is-dragging');
    if(pointerId!==undefined&&capture.hasPointerCapture(pointerId))capture.releasePointerCapture(pointerId);
  }
  function distance(event){
    return {x:event.clientX-start.x,y:event.clientY-start.y};
  }
  dialog.addEventListener('pointerdown',event=>{
    if(!event.isPrimary){suppressClick=true;reset();return;}
    if(event.button!==0||!dialog.open||!handle.getClientRects().length)return;
    if(!event.target.closest('[data-card-drag]'))return;
    const control=event.target.closest('button,select,input,a,textarea,label');
    if(control&&control!==handle)return;
    suppressClick=false;
    // Keep a handle tap targeted at its button; only background drags capture
    // on the dialog, so a click cannot activate unrelated header controls.
    const capture=control===handle?handle:dialog;
    start={id:event.pointerId,x:event.clientX,y:event.clientY,capture};
    capture.setPointerCapture(event.pointerId);
    dialog.classList.add('is-dragging');
  });
  dialog.addEventListener('pointermove',event=>{
    if(!start||start.id!==event.pointerId)return;
    const {x,y}=distance(event);
    if(Math.hypot(x,y)>8)suppressClick=true;
    const offset=y>Math.abs(x)?Math.min(y,180):0;
    dialog.style.setProperty('--sheet-drag',offset+'px');
  });
  dialog.addEventListener('pointerup',event=>{
    if(!start||start.id!==event.pointerId)return;
    const {x,y}=distance(event);
    if(Math.hypot(x,y)>8)suppressClick=true;
    reset();
    if(dialog.open&&y>=72&&y>Math.abs(x)*1.2)dialog.close();
  });
  function cancel(event){
    if(!start||start.id!==event.pointerId)return;
    suppressClick=true;reset();
  }
  dialog.addEventListener('pointercancel',cancel);
  dialog.addEventListener('lostpointercapture',cancel);
  handle.addEventListener('click',event=>{
    // A short or cancelled drag must not turn into a tap when the finger lifts.
    if(suppressClick&&event.detail!==0){event.preventDefault();return;}
    if(dialog.open)dialog.close();
  });
  dialog.addEventListener('close',reset);
  dialog.addEventListener('cancel',()=>{suppressClick=true;reset();});
}
