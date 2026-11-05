import {cleanProfile,emptyProfile} from './domain.js';

export const PROFILE_KEY='myfoodcard.profile.v2';
export function loadProfile(storage) {
  const current=storage.getItem(PROFILE_KEY);
  if(current!==null)return {profile:cleanProfile(JSON.parse(current)),saveFailed:false};
  const legacy=storage.getItem('myfoodcard.profile.v1');
  if(legacy===null)return {profile:emptyProfile(),saveFailed:false};
  const profile=cleanProfile(JSON.parse(legacy));
  // A separate key prevents an older open tab from erasing new intolerance data.
  try{storage.setItem(PROFILE_KEY,JSON.stringify(profile));return {profile,saveFailed:false};}
  catch{return {profile,saveFailed:true};}
}
