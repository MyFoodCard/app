import {ALLERGENS, DIETS, INGREDIENTS, LANGUAGES, cleanProfile, requirementCount} from './domain.js';

const invalidLink = () => new Error('This shared card link is invalid or unsupported. Ask the sender to copy a new link.');

// A fragment stays in the browser instead of being included in the hosting request.
export function createShareUrl(profile, baseUrl) {
  const p = cleanProfile(profile);
  if (!requirementCount(p)) throw invalidLink();
  const data = {v: 2, a: p.allergens, d: p.diets, i:p.intolerances.map(item=>[item.ingredient,item.avoidance]), c: p.crossContact, l: p.language};
  const encoded = btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = 'card=' + encoded;
  return url.href;
}

export function readSharedProfile(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (!params.has('card')) return null;
  const encoded = params.get('card');
  if (hash.length > 8192 || params.size !== 1 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw invalidLink();

  let data;
  try {
    data = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    throw invalidLink();
  }
  const validList = (items, allowed) => Array.isArray(items) &&
    items.length <= allowed.length && items.every(item => allowed.includes(item));
  // Reject unsupported requirements instead of silently dropping an allergy.
  if (!data || ![1,2].includes(data.v) || !validList(data.a, ALLERGENS) ||
      !validList(data.d, DIETS) || typeof data.c !== 'boolean' ||
      !LANGUAGES.includes(data.l)) throw invalidLink();
  if (data.v===1 && data.i!==undefined) throw invalidLink();
  const entries=data.v===1?[]:data.i;
  if (!Array.isArray(entries) || entries.length>INGREDIENTS.length || entries.some(item=>
    !Array.isArray(item) || item.length!==2 || !INGREDIENTS.includes(item[0]) || !['must','prefer'].includes(item[1]))) throw invalidLink();
  if (data.a.length+data.d.length+entries.length===0) throw invalidLink();

  return cleanProfile({version:2,allergens:data.a,diets:data.d,intolerances:entries.map(([ingredient,avoidance])=>({ingredient,avoidance})),crossContact:data.c,language:data.l});
}
