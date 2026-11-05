import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProfile,PROFILE_KEY} from '../dist/profile-storage.js';
import {emptyProfile} from '../dist/domain.js';

const memory = entries => {
  const data=new Map(entries);
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
};
const legacy=JSON.stringify({version:1,name:'Legacy name',allergens:['flaxseed'],diets:['vegan'],crossContact:false,language:'sk'});
test('storage migration retains the legacy backup and later loads prefer the version 3 profile',()=>{
  const storage=memory([['myfoodcard.profile.v1',legacy]]);
  const result=loadProfile(storage);
  assert.equal(result.saveFailed,false);assert.equal(result.profile.version,3);
  assert.deepEqual(result.profile.mustAvoid,['flaxseed']);assert.equal(result.profile.language,'sk');
  assert.equal(storage.getItem('myfoodcard.profile.v1'),legacy);
  assert.equal(Object.hasOwn(result.profile,'name'),false);
  const current={...result.profile,mustAvoid:['flaxseed','trehalose']};
  storage.setItem(PROFILE_KEY,JSON.stringify(current));
  storage.setItem('myfoodcard.profile.v1',JSON.stringify({...emptyProfile(),version:1}));
  assert.deepEqual(loadProfile(storage).profile,current);
});
test('a storage write failure does not discard a readable legacy profile',()=>{
  const storage=memory([['myfoodcard.profile.v1',legacy]]);
  storage.setItem=()=>{throw new Error('Quota');};
  const result=loadProfile(storage);
  assert.equal(result.saveFailed,true);assert.deepEqual(result.profile.mustAvoid,['flaxseed']);
});
test('invalid current data is not replaced with older requirements',()=>{
  const storage=memory([[PROFILE_KEY,'{"version":99}'],['myfoodcard.profile.v1',legacy]]);
  assert.throws(()=>loadProfile(storage));
  assert.equal(storage.getItem(PROFILE_KEY),'{"version":99}');
});

test('version 2 storage is migrated before version 1 and never downgrades strict exclusions',()=>{
  const v2=JSON.stringify({version:2,allergens:['flaxseed'],diets:[],language:'en',crossContact:true,intolerances:[{ingredient:'trehalose',avoidance:'must'},{ingredient:'onion',avoidance:'prefer'}]});
  const storage=memory([['myfoodcard.profile.v1',legacy],['myfoodcard.profile.v2',v2]]);
  assert.deepEqual(loadProfile(storage).profile,{...emptyProfile(),mustAvoid:['flaxseed','trehalose'],avoidIfPossible:['onion']});
  assert.equal(storage.getItem('myfoodcard.profile.v2'),v2);
  storage.setItem('myfoodcard.profile.v2','invalid old data');
  assert.deepEqual(loadProfile(storage).profile.mustAvoid,['flaxseed','trehalose']);
});
