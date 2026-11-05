import {ALLERGENS, DIETS, LANGUAGES, cleanProfile} from './domain.js';

const invalidLink = () => new Error('This shared card link is invalid or unsupported. Ask the sender to copy a new link.');

// A fragment stays in the browser instead of being included in the hosting request.
export function createShareUrl(profile, baseUrl) {
  const p = cleanProfile(profile);
  if (!p.allergens.length && !p.diets.length) throw invalidLink();
  const data = {v: 1, a: p.allergens, d: p.diets, c: p.crossContact, l: p.language};
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
  if (hash.length > 4096 || params.size !== 1 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw invalidLink();

  let data;
  try {
    data = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    throw invalidLink();
  }
  const validList = (items, allowed) => Array.isArray(items) &&
    items.length <= allowed.length && items.every(item => allowed.includes(item));
  // Reject unsupported requirements instead of silently dropping an allergy.
  if (!data || data.v !== 1 || !validList(data.a, ALLERGENS) ||
      !validList(data.d, DIETS) || typeof data.c !== 'boolean' ||
      !LANGUAGES.includes(data.l) || data.a.length + data.d.length === 0) throw invalidLink();

  return cleanProfile({version: 1, allergens: data.a, diets: data.d, crossContact: data.c, language: data.l});
}
