import assert from 'node:assert/strict';
import { bridgeHeaders, getBridgeToken } from './test_support.js';

/**
 * Test script for Designify Bridge Server
 * Tests the /api/health and /api/redesign endpoints against local Claude Code CLI
 */

async function runTest() {
  console.log('Testing Designify Bridge Server...\n');

  if (getBridgeToken().length < 32) {
    throw new Error('No bridge token found. Start the server first or set DESIGNIFY_BRIDGE_TOKEN.');
  }

  // 1. Health check
  console.log('1. Checking GET /api/health...');
  const healthRes = await fetch('http://127.0.0.1:3030/api/health', { headers: bridgeHeaders() });
  const healthData = await healthRes.json();
  console.log('Health check result:', healthData);

  if (!healthData.authenticated) throw new Error('Bridge token was rejected.');

  // 2. Sample redesign payload
  console.log('\n2. Testing POST /api/redesign with sample DOM...');
  const mockPayload = {
    url: 'https://example-oldsite.com',
    title: 'Acme Legacy Dashboard',
    metaDescription: 'Manage your internal projects and database queries',
    theme: 'linear',
    customPrompt: 'Create a clean, human-crafted dashboard layout with high information density, refined typography, and no generic AI gradients',
    engine: 'claude',
    domTree: [
      { mirrorId: 'd-1', tag: 'header', text: 'Acme Legacy Dashboard' },
      { mirrorId: 'd-2', tag: 'nav', text: 'Home Projects Settings Analytics' },
      { mirrorId: 'd-3', tag: 'h1', text: 'Welcome to Acme Internal Tools' },
      { mirrorId: 'd-4', tag: 'p', text: 'Search across 10,000 internal documents and project reports' },
      { mirrorId: 'd-5', tag: 'input', type: 'text', placeholder: 'Search projects, docs, or metrics...' },
      { mirrorId: 'd-6', tag: 'button', text: 'Search Database', isInteractive: true },
      { mirrorId: 'd-7', tag: 'button', text: 'Create New Project', isInteractive: true }
    ]
  };

  const startTime = Date.now();
  const redesignRes = await fetch('http://127.0.0.1:3030/api/redesign', {
    method: 'POST',
    headers: bridgeHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(mockPayload)
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nRedesign response received in ${duration}s (status: ${redesignRes.status})`);

  if (!redesignRes.ok) {
    const errorBody = await redesignRes.text();
    console.error('Error from server:', errorBody);
    process.exit(1);
  }

  const result = await redesignRes.json();
  console.log('\n✅ Redesign Generation Succeeded!');
  console.log('Theme:', result.themeName);
  console.log('Summary:', result.summary);
  console.log('HTML Length:', result.html.length, 'characters');
  console.log('CSS Length:', result.css.length, 'characters');

  // Verify mirror IDs are present in the redesigned HTML
  const hasInputMirror = result.html.includes('data-mirror-id="d-5"');
  const hasButtonMirror = result.html.includes('data-mirror-id="d-6"');
  console.log('Mirror ID verification:');
  console.log('- Search Input (d-5) mirrored:', hasInputMirror ? '✅ YES' : '❌ NO');
  console.log('- Button (d-6) mirrored:', hasButtonMirror ? '✅ YES' : '❌ NO');
  assert.equal(hasInputMirror, true);
  assert.equal(hasButtonMirror, true);
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
