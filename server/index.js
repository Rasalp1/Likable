import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { THEME_PRESETS, buildRedesignPrompt } from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3030;
const CLAUDE_BIN = '$HOME/.local/bin/claude';
const CODEX_BIN = '$HOME/.local/bin/codex';

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Check if a binary exists and is executable
function checkBinaryExists(binPath) {
  try {
    return fs.existsSync(binPath);
  } catch {
    return false;
  }
}

// Extract JSON from potential markdown codeblocks or text
function parseJsonSafely(rawOutput) {
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

    if (engine === 'codex') {
      command = checkBinaryExists(CODEX_BIN) ? CODEX_BIN : 'codex';
      args = ['exec', '-'];
    } else {
      command = checkBinaryExists(CLAUDE_BIN) ? CLAUDE_BIN : 'claude';
      args = ['-p'];
    }

    console.log(`[Designify Bridge] Invoking ${engine} (${command} ${args.join(' ')})...`);

    const child = spawn(command, args, {
      cwd: workDir || process.cwd(),
      env: { ...process.env, PATH: `${process.env.PATH}:$HOME/.local/bin:/usr/local/bin` },
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
      reject(new Error(`Failed to start ${engine}: ${err.message}`));
    });

    child.on('close', (code) => {
      console.log(`[Designify Bridge] ${engine} exited with code ${code}`);
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`${engine} error (code ${code}): ${stderr || 'Unknown error'}`));
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
    const claudeOk = checkBinaryExists(CLAUDE_BIN);
    const codexOk = checkBinaryExists(CODEX_BIN);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'designify-bridge',
      claudeAvailable: claudeOk,
      codexAvailable: codexOk,
      claudePath: CLAUDE_BIN,
      codexPath: CODEX_BIN,
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

        console.log(`[Designify Bridge] Received redesign request for: ${pageUrl || title} using theme: ${theme} and engine: ${engine}`);

        // Save screenshot to disk if provided
        if (screenshotBase64) {
          const cleanedBase64 = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
          const filename = `designify_snap_${Date.now()}.png`;
          tempScreenshotPath = path.join(os.tmpdir(), filename);
          fs.writeFileSync(tempScreenshotPath, Buffer.from(cleanedBase64, 'base64'));
          console.log(`[Designify Bridge] Screenshot saved to temp file: ${tempScreenshotPath}`);
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
          console.warn('[Designify Bridge] Failed to parse strict JSON from CLI output, falling back to structured recovery.');
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

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Designify Bridge Server running at http://127.0.0.1:${PORT}`);
  console.log(`- Claude CLI: ${checkBinaryExists(CLAUDE_BIN) ? 'READY (' + CLAUDE_BIN + ')' : 'NOT FOUND'}`);
  console.log(`- Codex CLI:  ${checkBinaryExists(CODEX_BIN) ? 'READY (' + CODEX_BIN + ')' : 'NOT FOUND'}`);
});
