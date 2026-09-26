import http from 'http';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { THEME_PRESETS, buildRedesignPrompt } from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3030;

// Resolve CLI executable path dynamically
function resolveBinary(name) {
  const candidates = [
    path.join(os.homedir(), '.local/bin', name),
    `/usr/local/bin/${name}`,
    `/opt/homebrew/bin/${name}`,
    path.join(os.homedir(), '.codex/bin', name)
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  try {
    const stdout = execSync(`which ${name}`, {
      env: { ...process.env, PATH: `${process.env.PATH}:${os.homedir()}/.local/bin:/usr/local/bin:/opt/homebrew/bin` },
      encoding: 'utf8'
    }).trim();
    if (stdout && fs.existsSync(stdout)) {
      return stdout;
    }
  } catch {}

  return null;
}

function getBinaryVersion(binPath) {
  if (!binPath) return null;
  try {
    const out = execSync(`"${binPath}" --version`, {
      env: { ...process.env, PATH: `${process.env.PATH}:${os.homedir()}/.local/bin:/usr/local/bin:/opt/homebrew/bin` },
      encoding: 'utf8',
      timeout: 3000
    }).trim();
    return out.split('\n')[0];
  } catch {
    return 'ready';
  }
}

const CLAUDE_BIN = resolveBinary('claude');
const CODEX_BIN = resolveBinary('codex');

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Extract JSON from potential markdown codeblocks, headers, or text
function parseJsonSafely(rawOutput) {
  if (!rawOutput) return null;

  // Try direct parse first
  try {
    return JSON.parse(rawOutput.trim());
  } catch {}

  // Try extracting markdown ```json ... ```
  const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {}
  }

  // Try finding opening { and closing }
  const firstBrace = rawOutput.indexOf('{');
  const lastBrace = rawOutput.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(rawOutput.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  return null;
}

// Execute prompt via CLI process using stdin
function runCLI({ engine = 'claude', prompt, workDir }) {
  return new Promise((resolve, reject) => {
    let command;
    let args;

    const extraPaths = `${os.homedir()}/.local/bin:/usr/local/bin:/opt/homebrew/bin:${os.homedir()}/.codex/bin`;
    const env = {
      ...process.env,
      PATH: `${extraPaths}:${process.env.PATH}`
    };

    if (engine === 'codex') {
      command = CODEX_BIN || resolveBinary('codex') || 'codex';
      args = ['exec', '--skip-git-repo-check', '-'];
    } else {
      command = CLAUDE_BIN || resolveBinary('claude') || 'claude';
      args = ['-p'];
    }

    console.log(`[Designify Bridge] Invoking ${engine} via: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd: workDir || process.cwd(),
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      console.error(`[Designify Bridge] Failed to spawn ${command}:`, err);
      reject(new Error(`Failed to start ${engine} (${command}): ${err.message}`));
    });

    child.on('close', (code) => {
      console.log(`[Designify Bridge] ${engine} exited with code ${code}`);
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`${engine} error (code ${code}): ${stderr || 'Process failed'}`));
      } else {
        resolve({ stdout, stderr, code });
      }
    });

    // Write the prompt to stdin and close
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Server request handler
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check endpoint
  if (url.pathname === '/api/health' && req.method === 'GET') {
    const claudePath = CLAUDE_BIN || resolveBinary('claude');
    const codexPath = CODEX_BIN || resolveBinary('codex');

    const claudeVer = getBinaryVersion(claudePath);
    const codexVer = getBinaryVersion(codexPath);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'designify-bridge',
      claudeAvailable: !!claudePath,
      codexAvailable: !!codexPath,
      claudePath: claudePath || null,
      codexPath: codexPath || null,
      claudeVersion: claudeVer,
      codexVersion: codexVer,
      defaultEngine: 'claude'
    }));
    return;
  }

  // Available themes endpoint
  if (url.pathname === '/api/themes' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      themes: Object.entries(THEME_PRESETS).map(([key, val]) => ({
        key,
        name: val.name,
        description: val.description,
        palette: val.palette
      }))
    }));
    return;
  }

  // Redesign generation endpoint
  if (url.pathname === '/api/redesign' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      let tempScreenshotPath = null;
      try {
        const payload = JSON.parse(body);
        const {
          url: pageUrl,
          title,
          metaDescription,
          theme = 'linear-dark',
          customPrompt,
          domTree = [],
          screenshotBase64,
          engine = 'claude'
        } = payload;

        console.log(`[Designify Bridge] Received redesign request for: ${pageUrl || title} | Theme: ${theme} | Engine: ${engine}`);

        // Save screenshot to disk if provided
        if (screenshotBase64) {
          const cleanedBase64 = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
          const filename = `designify_snap_${Date.now()}.png`;
          tempScreenshotPath = path.join(os.tmpdir(), filename);
          fs.writeFileSync(tempScreenshotPath, Buffer.from(cleanedBase64, 'base64'));
          console.log(`[Designify Bridge] Saved screenshot: ${tempScreenshotPath}`);
        }

        // Build prompt
        const prompt = buildRedesignPrompt({
          url: pageUrl,
          title,
          metaDescription,
          themeKey: theme,
          customPrompt,
          domTree,
          screenshotPath: tempScreenshotPath
        });

        // Run CLI
        const { stdout } = await runCLI({
          engine,
          prompt,
          workDir: os.tmpdir()
        });

        // Parse result
        const result = parseJsonSafely(stdout);

        if (!result || !result.html) {
          console.warn('[Designify Bridge] Failed to parse strict JSON from CLI output.');
          console.log('Raw output sample:', stdout.slice(0, 500));
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'AI output did not match expected JSON format',
            rawOutput: stdout.slice(0, 2000)
          }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          themeName: result.themeName || theme,
          summary: result.summary || 'Custom redesign generated with modern aesthetics',
          css: result.css || '',
          html: result.html || '',
          engineUsed: engine
        }));

      } catch (err) {
        console.error('[Designify Bridge] Error processing redesign:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: err.message
        }));
      } finally {
        // Clean up temp screenshot
        if (tempScreenshotPath && fs.existsSync(tempScreenshotPath)) {
          try {
            fs.unlinkSync(tempScreenshotPath);
          } catch {}
        }
      }
    });
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    try {
      const checkRes = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      const checkData = await checkRes.json();
      if (checkData.service === 'designify-bridge') {
        console.log(`\n✅ Designify Bridge Server is ALREADY running and healthy at http://127.0.0.1:${PORT}`);
        console.log(`- Claude CLI: ${checkData.claudeAvailable ? 'LINKED (' + checkData.claudePath + ')' : 'NOT FOUND'}`);
        console.log(`- Codex CLI:  ${checkData.codexAvailable ? 'LINKED (' + checkData.codexPath + ')' : 'NOT FOUND'}`);
        console.log(`Chrome extension is actively connected.\n`);
        return;
      }
    } catch {}

    console.error(`\n❌ Port ${PORT} is in use by another application.`);
    console.error(`To free up port ${PORT}, run:`);
    console.error(`  lsof -ti :${PORT} | xargs kill -9\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const claudePath = CLAUDE_BIN || resolveBinary('claude');
  const codexPath = CODEX_BIN || resolveBinary('codex');

  console.log(`🚀 Designify Bridge Server running at http://127.0.0.1:${PORT} (and http://localhost:${PORT})`);
  console.log(`- Claude CLI: ${claudePath ? 'LINKED (' + claudePath + ')' : 'NOT FOUND'}`);
  console.log(`- Codex CLI:  ${codexPath ? 'LINKED (' + codexPath + ')' : 'NOT FOUND'}`);
});
