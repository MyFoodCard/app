import test from 'node:test';
import assert from 'node:assert/strict';
import {ALLERGENS, DIETS, LANGUAGES, emptyProfile} from '../dist/domain.js';
import {createShareUrl, readSharedProfile} from '../dist/sharing.js';

const fragment = data => '#card=' + btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test('share links round-trip every supported requirement and language under GitHub Pages', () => {
  for (const language of LANGUAGES) {
    const profile = {...emptyProfile(), allergens: [...ALLERGENS], diets: [...DIETS], crossContact: false, language};
    const link = new URL(createShareUrl(profile, 'https://myfoodcard.github.io/app/?discard=this#old'));
    assert.equal(link.pathname, '/app/');
    assert.equal(link.search, '');
    assert.ok(link.hash.startsWith('#card='));
    assert.deepEqual(readSharedProfile(link.hash), profile);
  }
});

test('links contain only food preferences and parsing does not mutate the original profile', () => {
  const profile = {...emptyProfile(), name: 'Legacy name', token: 'Not for sharing', allergens: ['flaxseed'], diets: ['vegan']};
  const before = structuredClone(profile);
  const decoded = readSharedProfile(new URL(createShareUrl(profile, 'https://example.test/')).hash);
  assert.equal(Object.hasOwn(decoded, 'name'), false);
  assert.equal(Object.hasOwn(decoded, 'token'), false);
  decoded.allergens.push('milk');
  assert.deepEqual(profile, before);
});

test('invalid or unsupported links fail rather than silently losing requirements', () => {
  const valid = {v: 1, a: ['flaxseed'], d: ['vegan'], c: true, l: 'en'};
  for (const data of [null, [], {...valid, v: 2}, {...valid, a: ['unknown-allergy']},
    {...valid, a: 'flaxseed'}, {...valid, d: ['unknown-diet']}, {...valid, d: null},
    {...valid, c: 'true'}, {...valid, l: 'xx'}, {...valid, a: [], d: []},
    {...valid, a: Array(100).fill('flaxseed')}]) {
    assert.throws(() => readSharedProfile(fragment(data)), /invalid or unsupported/);
  }
  for (const hash of ['#card=', '#card=***', '#card=eA', '#card=' + 'x'.repeat(4097),
    fragment(valid) + '&card=duplicate', fragment(valid) + '&extra=field']) {
    assert.throws(() => readSharedProfile(hash), /invalid or unsupported/);
  }
  assert.throws(() => createShareUrl(emptyProfile(), 'https://example.test/'));
});

test('ordinary anchors do not create shared profiles', () => {
  assert.equal(readSharedProfile(''), null);
  assert.equal(readSharedProfile('#main'), null);
});
