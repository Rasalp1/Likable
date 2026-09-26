import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import {
  createServer,
  isOriginAllowed,
  loadBridgeToken,
  parseJsonSafely,
  validatePayload
} from './server/index.js';

const TOKEN = 'test-token-that-is-long-enough-for-authentication-1234567890';
const generatedResponse = {
  themeName: 'Linear',
  summary: 'A safe test redesign',
  css: '#designify-container { color: white; }',
  html: '<div id="designify-container"><button data-mirror-id="d-1">Test</button></div>'
};

function dispatch(server, { method = 'GET', url = '/', headers = {}, body = '' } = {}) {
  const request = new PassThrough();
  request.method = method;
  request.url = url;
  request.headers = headers;

  let resolveResponse;
  const responsePromise = new Promise((resolve) => { resolveResponse = resolve; });
  const response = {
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    writeHead(statusCode, headersToSet = {}) {
      this.statusCode = statusCode;
      Object.entries(headersToSet).forEach(([name, value]) => this.setHeader(name, value));
    },
    end(payload = '') {
      resolveResponse({ status: this.statusCode, headers: this.headers, body: String(payload) });
    }
  };

  server.emit('request', request, response);
  request.end(body);
  return responsePromise.then((result) => ({ ...result, json: JSON.parse(result.body) }));
}

test('payload validation enforces supported engines and bounded input', () => {
  const valid = validatePayload({ engine: 'codex', customPrompt: 'Keep the original copy.' });
  assert.equal(valid.engine, 'codex');
  assert.deepEqual(valid.domTree, []);

  assert.throws(
    () => validatePayload({ engine: 'shell' }),
    /engine must be either claude or codex/
  );
  assert.throws(
    () => validatePayload({ customPrompt: 'x'.repeat(4_001) }),
    /customPrompt exceeds/
  );
  assert.throws(
    () => validatePayload({ domTree: Array.from({ length: 201 }, () => ({})) }),
    /at most 200 nodes/
  );
});

test('token files are generated securely and environment tokens are validated', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'designify-test-'));
  const tokenPath = path.join(tempDir, '.bridge_token');
  try {
    const generated = loadBridgeToken({ env: {}, tokenPath });
    assert.equal(generated.length, 64);
    assert.equal(fs.statSync(tokenPath).mode & 0o777, 0o600);
    assert.equal(loadBridgeToken({ env: {}, tokenPath }), generated);
    assert.throws(() => loadBridgeToken({ env: { DESIGNIFY_BRIDGE_TOKEN: 'short' }, tokenPath }), /at least 32/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('origin checks reject file pages and permit local extension/dev origins', () => {
  assert.equal(isOriginAllowed('null'), false);
  assert.equal(isOriginAllowed('chrome-extension://abcdefghijklmnop'), true);
  assert.equal(isOriginAllowed('http://127.0.0.1:3030'), true);
  assert.equal(isOriginAllowed('https://attacker.example'), false);
});

test('bridge requires auth and never exposes executable paths in health output', async (t) => {
  const server = createServer({
    token: TOKEN,
    runCliImpl: async () => ({ stdout: JSON.stringify(generatedResponse) })
  });
  const auth = { authorization: `Bearer ${TOKEN}` };

  const unauthenticatedHealth = await dispatch(server, { url: '/api/health' });
  const health = unauthenticatedHealth.json;
  assert.equal(unauthenticatedHealth.status, 200);
  assert.equal(health.authenticated, false);
  assert.equal('claudePath' in health, false);

  const unauthorized = await dispatch(server, {
    method: 'POST',
    url: '/api/redesign',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  assert.equal(unauthorized.status, 401);

  const forbiddenOrigin = await dispatch(server, {
    method: 'POST',
    url: '/api/redesign',
    headers: { ...auth, 'content-type': 'application/json', origin: 'null' },
    body: '{}'
  });
  assert.equal(forbiddenOrigin.status, 403);

  const authorizedHealth = await dispatch(server, { url: '/api/health', headers: auth });
  assert.equal(authorizedHealth.json.authenticated, true);

  const redesign = await dispatch(server, {
    method: 'POST',
    url: '/api/redesign',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ engine: 'claude', domTree: [{ mirrorId: 'd-1', tag: 'button' }] })
  });
  assert.equal(redesign.status, 200);
  assert.equal(redesign.json.success, true);

  const oversizedPrompt = await dispatch(server, {
    method: 'POST',
    url: '/api/redesign',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ customPrompt: 'x'.repeat(4_001) })
  });
  assert.equal(oversizedPrompt.status, 413);
});

test('JSON parsing accepts strict JSON and fenced model output only', () => {
  assert.deepEqual(parseJsonSafely('{"ok":true}'), { ok: true });
  assert.deepEqual(parseJsonSafely('```json\n{"ok":true}\n```'), { ok: true });
  assert.equal(parseJsonSafely('not json'), null);
});
