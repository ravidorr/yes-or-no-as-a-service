import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildShareText,
  buildShareUrl,
  buildSocialShareLinks
} from '../public/share-utils.js';

const baseHref = 'https://example.test/?existing=1#fragment';

test('buildShareUrl replaces query params with request text and answer mode', () => {
  assert.equal(
    buildShareUrl(baseHref, 'Can I have a pony?', 'yes'),
    'https://example.test/?answer=yes&request=Can+I+have+a+pony%3F#fragment'
  );
  assert.equal(
    buildShareUrl(baseHref, 'Can I have a pony?', 'no'),
    'https://example.test/?answer=no&request=Can+I+have+a+pony%3F#fragment'
  );
});

test('buildShareUrl defaults answer mode to yes', () => {
  assert.equal(
    buildShareUrl(baseHref, 'Can I?'),
    'https://example.test/?answer=yes&request=Can+I%3F#fragment'
  );
});

test('buildShareText prefixes the request with the answer mode', () => {
  assert.equal(buildShareText('Can I have a pony?', 'yes'), 'YorNaaS says yes to: Can I have a pony?');
  assert.equal(buildShareText('Can I have a pony?', 'no'), 'YorNaaS says no to: Can I have a pony?');
});

test('buildSocialShareLinks returns encoded provider URLs', () => {
  const yesLinks = buildSocialShareLinks(baseHref, 'Can I?', 'yes');

  assert.equal(yesLinks.url, 'https://example.test/?answer=yes&request=Can+I%3F#fragment');
  assert.match(yesLinks.x, /^https:\/\/twitter\.com\/intent\/tweet\?/);
  assert.match(yesLinks.facebook, /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
  assert.match(yesLinks.linkedIn, /^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=/);
  assert.match(yesLinks.email, /^mailto:\?subject=YorNaaS(%20|\+)link&body=/);
  assert.match(yesLinks.whatsApp, /^https:\/\/wa\.me\/\?text=/);

  const noLinks = buildSocialShareLinks(baseHref, 'Can I?', 'no');

  assert.equal(noLinks.url, 'https://example.test/?answer=no&request=Can+I%3F#fragment');
  assert.match(noLinks.email, /^mailto:\?subject=YorNaaS(%20|\+)link&body=/);
});
