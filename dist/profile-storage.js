import {cleanProfile,emptyProfile} from './domain.js';

export const PROFILE_KEY='myfoodcard.profile.v3';
export const LEGACY_PROFILE_KEYS=['myfoodcard.profile.v2','myfoodcard.profile.v1'];
export function loadProfile(storage) {
  const current=storage.getItem(PROFILE_KEY);
  if(current!==null)return {profile:cleanProfile(JSON.parse(current)),saveFailed:false};
  let legacy=null;
  for(const key of LEGACY_PROFILE_KEYS){legacy=storage.getItem(key);if(legacy!==null)break;}
  if(legacy===null)return {profile:emptyProfile(),saveFailed:false};
  const profile=cleanProfile(JSON.parse(legacy));
  // Separate versions prevent older open tabs from overwriting migrated requirements.
  try{storage.setItem(PROFILE_KEY,JSON.stringify(profile));return {profile,saveFailed:false};}
  catch{return {profile,saveFailed:true};}
}
