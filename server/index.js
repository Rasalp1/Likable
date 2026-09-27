import http from 'http';
import { execFileSync, spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { THEME_PRESETS, buildRedesignPrompt } from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PORT = 3030;
const HOST = '127.0.0.1';
const TOKEN_PATH = path.join(PROJECT_ROOT, '.bridge_token');
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const MAX_GENERATED_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_CLI_OUTPUT_BYTES = 8 * 1024 * 1024;
function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const DEFAULT_CLI_TIMEOUT_MS = positiveInteger(process.env.LIKABLE_CLI_TIMEOUT_MS || process.env.CLI_TIMEOUT_MS, 240_000);
const DEFAULT_MAX_CONCURRENT = 1;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertString(value, field, maxLength, { optional = true } = {}) {
  if (value === undefined || value === null) {
    if (optional) return '';
    throw httpError(400, `${field} is required.`);
  }
  if (typeof value !== 'string') {
    throw httpError(400, `${field} must be a string.`);
  }
  if (value.length > maxLength) {
    throw httpError(413, `${field} exceeds the ${maxLength}-character limit.`);
  }
  return value;
}

function decodeScreenshot(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw httpError(400, 'screenshotBase64 must be a string.');
  }

  const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/i);
  const encoded = (match ? match[2] : value).replace(/\s/g, '');
  if (!encoded || encoded.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw httpError(400, 'screenshotBase64 must be a valid PNG, JPEG, or WebP data URL.');
  }

  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_SCREENSHOT_BYTES) {
    throw httpError(413, `Screenshots must be smaller than ${MAX_SCREENSHOT_BYTES} bytes.`);
  }

  return bytes;
}

export function validatePayload(payload) {
  if (!isPlainObject(payload)) {
    throw httpError(400, 'Request body must be a JSON object.');
  }

  const engine = payload.engine || 'claude';
  if (!['claude', 'codex'].includes(engine)) {
    throw httpError(400, 'engine must be either claude or codex.');
  }

  const domTree = payload.domTree === undefined ? [] : payload.domTree;
  if (!Array.isArray(domTree) || domTree.length > 200) {
    throw httpError(413, 'domTree must contain at most 200 nodes.');
  }
  for (const node of domTree) {
    if (!isPlainObject(node)) throw httpError(400, 'domTree entries must be objects.');
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string' && value.length > 2_000) {
        throw httpError(413, `domTree.${key} contains an oversized value.`);
      }
    }
  }

  let customPreset = null;
  if (payload.customPreset !== undefined && payload.customPreset !== null) {
    if (!isPlainObject(payload.customPreset)) {
      throw httpError(400, 'customPreset must be an object.');
    }
    customPreset = {
      id: assertString(payload.customPreset.id, 'customPreset.id', 128),
      name: assertString(payload.customPreset.name, 'customPreset.name', 128),
      description: assertString(payload.customPreset.description, 'customPreset.description', 1_000),
      originUrl: assertString(payload.customPreset.originUrl, 'customPreset.originUrl', 2_048),
      palette: isPlainObject(payload.customPreset.palette) ? payload.customPreset.palette : {},
      layout: isPlainObject(payload.customPreset.layout) ? payload.customPreset.layout : {},
      geometry: isPlainObject(payload.customPreset.geometry) ? payload.customPreset.geometry : {},
      padding: isPlainObject(payload.customPreset.padding) ? payload.customPreset.padding : {},
      elevation: isPlainObject(payload.customPreset.elevation) ? payload.customPreset.elevation : {},
      typography: isPlainObject(payload.customPreset.typography) ? payload.customPreset.typography : {},
      mandate: assertString(payload.customPreset.mandate, 'customPreset.mandate', 10_000)
    };
  }

  const screenshot = decodeScreenshot(payload.screenshotBase64);
  return {
    url: assertString(payload.url, 'url', 4_096),
    title: assertString(payload.title, 'title', 500),
    metaDescription: assertString(payload.metaDescription, 'metaDescription', 2_000),
    theme: assertString(payload.theme || 'linear', 'theme', 128),
    customPreset,
    customPrompt: assertString(payload.customPrompt, 'customPrompt', 4_000),
    domTree,
    screenshot,
    engine
  };
}

export function loadBridgeToken({ env = process.env, tokenPath = TOKEN_PATH } = {}) {
  const fromEnvironment =
    env.LIKABLE_BRIDGE_TOKEN?.trim() ||
    env.LIKEABLE_BRIDGE_TOKEN?.trim() ||
    env.DESIGNIFY_BRIDGE_TOKEN?.trim();
  if (fromEnvironment) {
    if (fromEnvironment.length < 32) {
      const varName = env.LIKABLE_BRIDGE_TOKEN
        ? 'LIKABLE_BRIDGE_TOKEN'
        : (env.LIKEABLE_BRIDGE_TOKEN ? 'LIKEABLE_BRIDGE_TOKEN' : 'DESIGNIFY_BRIDGE_TOKEN');
      throw new Error(`${varName} must be at least 32 characters long.`);
    }
    return fromEnvironment;
  }

  try {
    const fromFile = fs.readFileSync(tokenPath, 'utf8').trim();
    if (fromFile.length >= 32) return fromFile;
    throw new Error('The existing .bridge_token is too short. Delete it and restart the bridge.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(tokenPath, `${generated}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    return generated;
  }
}

function tokenMatches(requestToken, expectedToken) {
  if (!requestToken || !expectedToken) return false;
  const provided = Buffer.from(requestToken);
  const expected = Buffer.from(expectedToken);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function requestToken(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }
  const headerToken =
    req.headers['x-likable-token'] ||
    req.headers['x-likeable-token'] ||
    req.headers['x-designify-token'];
  return typeof headerToken === 'string' ? headerToken.trim() : '';
}

function isAuthorized(req, token) {
  return tokenMatches(requestToken(req), token);
}

export function isOriginAllowed(origin) {
  if (!origin) return true; // Node clients do not send Origin.
  if (origin === 'null') return false; // Do not allow file:// pages to call the bridge.
  if (origin.startsWith('chrome-extension://')) return true; // Token auth still applies.
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Likable-Token, X-Likeable-Token, X-Designify-Token');
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function sendUnauthorized(res) {
  sendJson(res, 401, { error: 'Unauthorized. Configure the Likable bridge token in the extension.' }, {
    'WWW-Authenticate': 'Bearer'
  });
}

function readRequestBody(req, maxBytes = MAX_BODY_BYTES, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let finished = false;

    const timeout = setTimeout(() => {
      fail(httpError(408, 'Request body upload timed out.'));
    }, timeoutMs);

    const fail = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      req.resume();
      reject(error);
    };

    req.on('data', (chunk) => {
      if (finished) return;
      size += chunk.length;
      if (size > maxBytes) {
        fail(httpError(413, `Request body exceeds the ${maxBytes}-byte limit.`));
        return;
      }
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        resolve(body);
      }
    });
    req.on('close', () => {
      if (!finished && !req.complete) {
        fail(httpError(400, 'Request connection closed prematurely.'));
      }
    });
    req.on('aborted', () => fail(httpError(400, 'Request was aborted.')));
    req.on('error', fail);
  });
}

function resolveBinary(name) {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return null;
  const candidates = [
    path.join(os.homedir(), '.local/bin', name),
    `/usr/local/bin/${name}`,
    `/opt/homebrew/bin/${name}`,
    path.join(os.homedir(), '.codex/bin', name)
  ];

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {}
  }

  try {
    const stdout = execFileSync('which', [name], {
      env: { ...process.env, PATH: `${process.env.PATH || ''}:${os.homedir()}/.local/bin:/usr/local/bin:/opt/homebrew/bin` },
      encoding: 'utf8',
      timeout: 3_000
    }).trim();
    return stdout && fs.existsSync(stdout) ? stdout : null;
  } catch {
    return null;
  }
}

function getBinaryVersion(binPath) {
  if (!binPath) return null;
  try {
    const output = execFileSync(binPath, ['--version'], {
      env: { ...process.env, PATH: `${process.env.PATH || ''}:${os.homedir()}/.local/bin:/usr/local/bin:/opt/homebrew/bin` },
      encoding: 'utf8',
      timeout: 3_000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return output.split('\n')[0].slice(0, 200) || 'ready';
  } catch {
    return 'ready';
  }
}

export function parseJsonSafely(rawOutput) {
  if (!rawOutput) return null;
  try {
    return JSON.parse(rawOutput.trim());
  } catch {}

  const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {}
  }

  const firstBrace = rawOutput.indexOf('{');
  const lastBrace = rawOutput.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(rawOutput.slice(firstBrace, lastBrace + 1));
    } catch {}
  }
  return null;
}

export function runCLI({ engine = 'claude', prompt, workDir, timeoutMs = DEFAULT_CLI_TIMEOUT_MS, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(httpError(499, 'Request aborted by client.'));
      return;
    }
    const claudeBin = resolveBinary('claude');
    const codexBin = resolveBinary('codex');
    const command = engine === 'codex' ? (codexBin || 'codex') : (claudeBin || 'claude');
    const args = engine === 'codex' ? ['exec', '--skip-git-repo-check', '-'] : ['-p'];
    const env = {
      ...process.env,
      PATH: `${os.homedir()}/.local/bin:/usr/local/bin:/opt/homebrew/bin:${os.homedir()}/.codex/bin:${process.env.PATH || ''}`
    };
    const child = spawn(command, args, {
      cwd: workDir || os.tmpdir(),
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timeout;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      callback(value);
    };

    const onAbort = () => {
      try { child.kill('SIGTERM'); } catch {}
      setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
      }, 1_000).unref();
      finish(reject, httpError(499, 'Request aborted by client.'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    const appendOutput = (target, chunk) => {
      const next = target + chunk.toString();
      if (Buffer.byteLength(next, 'utf8') > MAX_CLI_OUTPUT_BYTES) {
        child.kill('SIGTERM');
        finish(reject, httpError(502, 'AI CLI output exceeded the configured limit.'));
        return target;
      }
      return next;
    };

    child.stdout.on('data', (chunk) => { stdout = appendOutput(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = appendOutput(stderr, chunk); });
    child.on('error', (error) => finish(reject, new Error(`Failed to start ${engine}: ${error.message}`)));
    child.on('close', (code) => {
      if (settled) return;
      if (code !== 0 && !stdout.trim()) {
        finish(reject, new Error(`${engine} error (code ${code}): ${stderr.slice(0, 1_000) || 'Process failed'}`));
      } else {
        finish(resolve, { stdout, stderr, code });
      }
    });

    timeout = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 2_000).unref();
      finish(reject, httpError(504, `The ${engine} CLI exceeded the ${timeoutMs}ms timeout.`));
    }, timeoutMs);

    child.stdin.on('error', () => {});
    child.stdin.end(prompt);
  });
}

export function createServer({ token, runCliImpl = runCLI, maxConcurrent = DEFAULT_MAX_CONCURRENT } = {}) {
  if (!token || token.length < 32) throw new Error('A bridge token of at least 32 characters is required.');
  let activeRequests = 0;
  const claudeBin = resolveBinary('claude');
  const codexBin = resolveBinary('codex');

  const server = http.createServer(async (req, res) => {
    setCorsHeaders(req, res);

    if (req.headers.origin && !isOriginAllowed(req.headers.origin)) {
      sendJson(res, 403, { error: 'Forbidden origin.' });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${DEFAULT_PORT}`}`);
    const authorized = isAuthorized(req, token);

    if (url.pathname === '/api/health' && req.method === 'GET') {
      const response = {
        status: 'ok',
        service: 'likable-bridge',
        authenticated: authorized,
        requiresAuth: true
      };
      if (authorized) {
        response.claudeAvailable = !!claudeBin;
        response.codexAvailable = !!codexBin;
        response.claudeVersion = getBinaryVersion(claudeBin);
        response.codexVersion = getBinaryVersion(codexBin);
        response.defaultEngine = 'claude';
      }
      sendJson(res, 200, response);
      return;
    }

    if (!authorized) {
      sendUnauthorized(res);
      return;
    }

    if (url.pathname === '/api/themes' && req.method === 'GET') {
      sendJson(res, 200, {
        themes: Object.entries(THEME_PRESETS).map(([key, value]) => ({
          key,
          id: value.id || key,
          label: value.label || value.name,
          name: value.name,
          isCustom: false,
          originUrl: value.originUrl || '',
          description: value.description,
          palette: value.palette,
          layout: value.layout,
          geometry: value.geometry,
          padding: value.padding,
          elevation: value.elevation,
          typography: value.typography,
          mandate: value.mandate
        }))
      });
      return;
    }

    if (url.pathname !== '/api/redesign' || req.method !== 'POST') {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    let payload;
    try {
      const body = await readRequestBody(req);
      let rawPayload;
      try {
        rawPayload = JSON.parse(body);
      } catch {
        throw httpError(400, 'Request body must contain valid JSON.');
      }
      payload = validatePayload(rawPayload);
    } catch (error) {
      const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 400;
      sendJson(res, statusCode, { error: error.message || 'Invalid redesign request.' });
      return;
    }

    if (activeRequests >= maxConcurrent) {
      sendJson(res, 429, { error: 'Another redesign is already running. Try again shortly.' }, { 'Retry-After': '5' });
      return;
    }

    activeRequests += 1;
    let tempScreenshotPath = null;
    const abortController = new AbortController();
    const onClientClose = () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    };
    if (typeof res.on === 'function') res.on('close', onClientClose);

    try {
      if (payload.screenshot) {
        tempScreenshotPath = path.join(os.tmpdir(), `likable_snap_${crypto.randomUUID()}.png`);
        fs.writeFileSync(tempScreenshotPath, payload.screenshot, { mode: 0o600, flag: 'wx' });
      }

      const prompt = buildRedesignPrompt({
        url: payload.url,
        title: payload.title,
        metaDescription: payload.metaDescription,
        themeKey: payload.theme,
        customPreset: payload.customPreset,
        customPrompt: payload.customPrompt,
        domTree: payload.domTree,
        screenshotPath: tempScreenshotPath
      });

      const { stdout } = await runCliImpl({
        engine: payload.engine,
        prompt,
        workDir: os.tmpdir(),
        signal: abortController.signal
      });
      const result = parseJsonSafely(stdout);
      if (!isPlainObject(result) || typeof result.html !== 'string' || !result.html.trim()) {
        throw httpError(502, 'AI output did not match the expected JSON format.');
      }
      if (Buffer.byteLength(result.html, 'utf8') > MAX_GENERATED_OUTPUT_BYTES ||
          Buffer.byteLength(String(result.css || ''), 'utf8') > MAX_GENERATED_OUTPUT_BYTES) {
        throw httpError(502, 'AI output exceeded the configured size limit.');
      }

      sendJson(res, 200, {
        success: true,
        themeName: typeof result.themeName === 'string' ? result.themeName.slice(0, 120) : payload.theme,
        summary: typeof result.summary === 'string' ? result.summary.slice(0, 1_000) : 'Redesign generated with modern aesthetics',
        css: typeof result.css === 'string' ? result.css : '',
        html: result.html,
        engineUsed: payload.engine
      });
    } catch (error) {
      const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
      if (statusCode >= 500) console.error('[Likable Bridge] Request failed:', error.message);
      if (!res.writableEnded) {
        const message = (statusCode === 504 || statusCode === 502) ? error.message : (statusCode >= 500 ? 'Redesign request failed.' : error.message);
        sendJson(res, statusCode, { error: message });
      }
    } finally {
      activeRequests = Math.max(0, activeRequests - 1);
      if (typeof res.off === 'function') res.off('close', onClientClose);
      if (tempScreenshotPath) {
        try { fs.unlinkSync(tempScreenshotPath); } catch {}
      }
    }
  });

  server.requestTimeout = DEFAULT_CLI_TIMEOUT_MS + 15_000;
  return server;
}

export function startServer({ port = positiveInteger(process.env.PORT, DEFAULT_PORT) } = {}) {
  const token = loadBridgeToken();
  const server = createServer({ token });

  server.on('error', (error) => {
    console.error(`[Likable Bridge] Server error: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, HOST, () => {
    console.log(`Likable Bridge Server listening on http://${HOST}:${port}`);
    console.log(`Bridge token (copy into the extension popup): ${token}`);
    console.log(`Bridge token file: ${TOKEN_PATH}`);
    console.log(`Claude CLI: ${claudeStatus()}`);
    console.log(`Codex CLI: ${codexStatus()}`);
  });
  return server;
}

function claudeStatus() {
  return resolveBinary('claude') ? 'available' : 'not found';
}

function codexStatus() {
  return resolveBinary('codex') ? 'available' : 'not found';
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}
