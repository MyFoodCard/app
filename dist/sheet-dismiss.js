// Only the handle owns gestures. Card content retains native scrolling and selection.
export function bindSheetDismissal(dialog,handle){
  let start=null,suppressClick=false;
  function reset(){
    const pointerId=start?.id;
    start=null;
    dialog.style.removeProperty('--sheet-drag');
    dialog.classList.remove('is-dragging');
    if(pointerId!==undefined&&handle.hasPointerCapture(pointerId))handle.releasePointerCapture(pointerId);
  }
  function distance(event){
    return {x:event.clientX-start.x,y:event.clientY-start.y};
  }
  handle.addEventListener('pointerdown',event=>{
    if(!event.isPrimary){suppressClick=true;reset();return;}
    if(event.button!==0||!dialog.open)return;
    suppressClick=false;
    start={id:event.pointerId,x:event.clientX,y:event.clientY};
    handle.setPointerCapture(event.pointerId);
    dialog.classList.add('is-dragging');
  });
  handle.addEventListener('pointermove',event=>{
    if(!start||start.id!==event.pointerId)return;
    const {x,y}=distance(event);
    if(Math.hypot(x,y)>8)suppressClick=true;
    const offset=y>Math.abs(x)?Math.min(y,180):0;
    dialog.style.setProperty('--sheet-drag',offset+'px');
  });
  handle.addEventListener('pointerup',event=>{
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
  handle.addEventListener('pointercancel',cancel);
  handle.addEventListener('lostpointercapture',cancel);
  handle.addEventListener('click',event=>{
    // A short or cancelled drag must not turn into a tap when the finger lifts.
    if(suppressClick&&event.detail!==0){event.preventDefault();return;}
    if(dialog.open)dialog.close();
  });
  dialog.addEventListener('close',reset);
  dialog.addEventListener('cancel',()=>{suppressClick=true;reset();});
}
