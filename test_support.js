import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export function getBridgeToken() {
  const token = process.env.DESIGNIFY_BRIDGE_TOKEN?.trim();
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
