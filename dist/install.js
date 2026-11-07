// Installation is optional and never reads or changes the food profile.
export function installPlatform(navigator){
  const ua=navigator.userAgent||'';
  if(/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return 'ios';
  if(/Macintosh|Mac OS X/i.test(ua)&&/Safari/i.test(ua)&&!/Chrome|Chromium|Edg|OPR/i.test(ua))return 'mac';
  return 'other';
}

export function bindInstallButton({window,button,dialog,closeButton,steps}){
  const standalone=window.matchMedia('(display-mode: standalone)');
  let prompt=null,busy=false,wasInstalled=false;
  const isInstalled=()=>wasInstalled||standalone.matches||window.navigator.standalone===true;
  function update(){
    button.hidden=isInstalled();
    button.disabled=busy;
    if(isInstalled()&&dialog.open)dialog.close();
  }
  function showHelp(){
    const platform=installPlatform(window.navigator);
    for(const list of steps)list.hidden=list.dataset.installPlatform!==platform;
    if(!dialog.open)dialog.showModal();
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    prompt=event;
    update();
  });
  window.addEventListener('appinstalled',()=>{
    wasInstalled=true;prompt=null;update();
  });
  standalone.addEventListener('change',update);
  window.addEventListener('pageshow',update);
  button.addEventListener('click',async()=>{
    if(isInstalled()||busy)return;
    if(!prompt){showHelp();return;}
    // Native prompts require a user gesture and may be used only once.
    const pending=prompt;prompt=null;busy=true;update();
    try{await pending.prompt();}
    catch{if(!isInstalled())showHelp();}
    finally{busy=false;update();}
  });
  closeButton.addEventListener('click',()=>dialog.close());
  update();
}
