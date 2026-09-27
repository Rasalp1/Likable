import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function getBridgeToken() {
  const token = (process.env.LIKABLE_BRIDGE_TOKEN || process.env.LIKEABLE_BRIDGE_TOKEN || process.env.DESIGNIFY_BRIDGE_TOKEN)?.trim();
  if (token) return token;
  try {
    return fs.readFileSync(path.join(projectRoot, '.bridge_token'), 'utf8').trim();
  } catch {
    return '';
  }
}

export function bridgeHeaders(extra = {}) {
  const token = getBridgeToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

if (process.env.NODE_TEST_CONTEXT) {
  const { default: test } = await import('node:test');
  const { default: assert } = await import('node:assert/strict');

  test('test_support provides bridge token helper and authorization headers', () => {
    const token = getBridgeToken();
    assert.equal(typeof token, 'string');
    const headers = bridgeHeaders({ 'Content-Type': 'application/json' });
    assert.equal(headers['Content-Type'], 'application/json');
    if (token) {
      assert.equal(headers.Authorization, `Bearer ${token}`);
    }
  });
}

