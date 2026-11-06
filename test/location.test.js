import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {countryAt,countrySuggestions} from '../dist/domain.js';
const {countries}=JSON.parse(readFileSync(new URL('../dist/countries.json',import.meta.url)));

test('coastal gaps offer nearby countries instead of claiming there is no match',()=>{
  for(const [lon,lat,expected] of [[33.8116,27.2579,'EGY'],[34.3299,27.9158,'EGY'],[34.8918,25.0676,'EGY'],[98.3923,7.8804,'THA']]){
    assert.equal(countryAt(lon,lat,countries),null,'these points reproduce the generalized-map gap');
    const matches=countrySuggestions(lon,lat,countries);
    assert.equal(matches[0].country.code,expected);assert.equal(matches[0].approximate,true);
    assert.ok(matches.every(match=>match.distanceKm<=25));
  }
});
test('inland matches stay exact and remote or invalid points do not invent countries',()=>{
  const [match]=countrySuggestions(31.2357,30.0444,countries);
  assert.equal(match.country.code,'EGY');assert.equal(match.approximate,false);
  for(const [lon,lat] of [[-35,0],[NaN,0],[181,0],[0,91]])assert.deepEqual(countrySuggestions(lon,lat,countries),[]);
});
test('nearby candidates are kept when more than one country may fit a coastal location',()=>{
  const matches=countrySuggestions(34.5134,28.5091,countries);
  assert.equal(matches[0].country.code,'EGY');assert.ok(matches.some(match=>match.country.code==='SAU'));
  assert.ok(matches[0].distanceKm<matches[1].distanceKm);
});
