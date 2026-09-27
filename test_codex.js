import assert from 'node:assert/strict';
import { bridgeHeaders, getBridgeToken } from './test_support.js';

async function fetchWithRetry(url, options, maxRetries = 15, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status === 429 && attempt < maxRetries) {
      console.log(`Bridge busy (429). Retrying Codex redesign in ${delayMs / 1000}s (attempt ${attempt}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    return res;
  }
}

/**
 * Quick verification for Codex engine in Likeable Bridge
 */
async function testCodex() {
  console.log('Testing Codex Engine via Bridge Server...');
  if (getBridgeToken().length < 32) throw new Error('No bridge token found.');
  const payload = {
    url: 'https://test-dashboard.local',
    title: 'Codex Test Dashboard',
    theme: 'lovable',
    engine: 'codex',
    domTree: [
      { mirrorId: 'd-1', tag: 'header', text: 'Codex Engine Test' },
      { mirrorId: 'd-2', tag: 'input', type: 'text', placeholder: 'Codex search...' },
      { mirrorId: 'd-3', tag: 'button', text: 'Codex Button', isInteractive: true }
    ]
  };

  const res = await fetchWithRetry('http://127.0.0.1:3030/api/redesign', {
    method: 'POST',
    headers: bridgeHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Codex test result status:', res.status);
  console.log('Success:', data.success);
  console.log('Engine used:', data.engineUsed);
  console.log('HTML Length:', data.html?.length);
  console.log('CSS Length:', data.css?.length);

  assert.equal(res.status, 200, `Expected status 200 but got ${res.status}`);
  assert.equal(data.success, true, 'Expected redesign success to be true');
  assert.equal(data.engineUsed, 'codex', 'Expected engineUsed to be codex');
  assert.ok(typeof data.html === 'string' && data.html.length > 0, 'Expected valid html output');
}

testCodex().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
