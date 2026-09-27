import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import {
  createServer,
  isOriginAllowed,
  loadBridgeToken,
  parseJsonSafely,
  validatePayload
} from '../server/index.js';

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
    writableEnded: false,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    writeHead(statusCode, headersToSet = {}) {
      this.statusCode = statusCode;
      Object.entries(headersToSet).forEach(([name, value]) => this.setHeader(name, value));
    },
    end(payload = '') {
      this.writableEnded = true;
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

  // Custom preset validation
  const withPreset = validatePayload({
    engine: 'claude',
    customPreset: {
      id: 'preset-stripe',
      name: 'Stripe',
      description: 'Extracted Stripe design system',
      palette: { background: '#f6f9fc', accent: '#635bff' },
      mandate: '### Stripe mandate'
    }
  });
  assert.equal(withPreset.customPreset.name, 'Stripe');
  assert.equal(withPreset.customPreset.palette.accent, '#635bff');

  assert.throws(
    () => validatePayload({ customPreset: 'not-an-object' }),
    /customPreset must be an object/
  );
  assert.throws(
    () => validatePayload({ customPreset: { name: 'x'.repeat(129) } }),
    /customPreset.name exceeds/
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

test('bridge enforces max concurrent redesigns and releases slot upon completion', async () => {
  let blockCli = true;
  let releaseCli;
  let cliStarted;
  const cliStartedPromise = new Promise((resolve) => { cliStarted = resolve; });

  const server = createServer({
    token: TOKEN,
    maxConcurrent: 1,
    runCliImpl: () => new Promise((resolve) => {
      if (!blockCli) {
        resolve({ stdout: JSON.stringify(generatedResponse) });
        return;
      }
      cliStarted();
      releaseCli = () => resolve({ stdout: JSON.stringify(generatedResponse) });
    })
  });
  const auth = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };

  const req1Promise = dispatch(server, {
    method: 'POST',
    url: '/api/redesign',
    headers: auth,
    body: JSON.stringify({ engine: 'claude', domTree: [] })
  });

  await cliStartedPromise;

  const req2 = await dispatch(server, {
    method: 'POST',
    url: '/api/redesign',
    headers: auth,
    body: JSON.stringify({ engine: 'claude', domTree: [] })
  });
  assert.equal(req2.status, 429);
  assert.equal(req2.json.error, 'Another redesign is already running. Try again shortly.');

  blockCli = false;
  releaseCli();
  const req1 = await req1Promise;
  assert.equal(req1.status, 200);

  const req3 = await dispatch(server, {
    method: 'POST',
    url: '/api/redesign',
    headers: auth,
    body: JSON.stringify({ engine: 'claude', domTree: [] })
  });
  assert.equal(req3.status, 200);
});

test('bridge passes abort signal and frees slot if client aborts', async () => {
  let receivedSignal;
  let cliStarted;
  const cliStartedPromise = new Promise((resolve) => { cliStarted = resolve; });
  let cliFinished;
  const cliFinishedPromise = new Promise((resolve) => { cliFinished = resolve; });

  const server = createServer({
    token: TOKEN,
    maxConcurrent: 1,
    runCliImpl: ({ signal }) => new Promise((resolve, reject) => {
      receivedSignal = signal;
      cliStarted();
      signal.addEventListener('abort', () => {
        cliFinished();
        reject(new Error('aborted'));
      });
    })
  });
  const auth = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };

  const request = new PassThrough();
  request.method = 'POST';
  request.url = '/api/redesign';
  request.headers = auth;

  const response = new EventEmitter();
  response.headers = {};
  response.statusCode = 200;
  response.writableEnded = false;
  response.setHeader = function(name, value) { this.headers[name.toLowerCase()] = value; };
  response.writeHead = function(statusCode, headersToSet = {}) {
    this.statusCode = statusCode;
    Object.entries(headersToSet).forEach(([name, value]) => this.setHeader(name, value));
  };
  response.end = function() { this.writableEnded = true; };

  server.emit('request', request, response);
  request.end(JSON.stringify({ engine: 'claude', domTree: [] }));

  await cliStartedPromise;
  assert.ok(receivedSignal);
  assert.equal(receivedSignal.aborted, false);

  response.emit('close');
  await cliFinishedPromise;
  assert.equal(receivedSignal.aborted, true);
});

test('bridge preserves actionable timeout message on 504', async () => {
  const server = createServer({
    token: TOKEN,
    runCliImpl: () => {
      const err = new Error('The claude CLI exceeded the 240000ms timeout.');
      err.statusCode = 504;
      return Promise.reject(err);
    }
  });
  const auth = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };

  const res = await dispatch(server, {
    method: 'POST',
    url: '/api/redesign',
    headers: auth,
    body: JSON.stringify({ engine: 'claude', domTree: [] })
  });

  assert.equal(res.status, 504);
  assert.equal(res.json.error, 'The claude CLI exceeded the 240000ms timeout.');
});

