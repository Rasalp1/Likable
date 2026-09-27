import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const backgroundSource = readFileSync(new URL('./background.js', import.meta.url), 'utf8');

test('page access is user activated instead of automatic on every URL', () => {
  assert.equal(manifest.permissions.includes('activeTab'), true);
  assert.deepEqual(manifest.host_permissions, [
    'http://127.0.0.1:3030/*',
    'http://localhost:3030/*'
  ]);
  assert.equal('content_scripts' in manifest, false);
  assert.equal(manifest.web_accessible_resources[0].matches.includes('<all_urls>'), false);
  assert.doesNotMatch(backgroundSource, /chrome\.runtime\.onInstalled/);
});
