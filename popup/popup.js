/**
 * Designify Popup Script
 */

const BRIDGE_TOKEN_KEY = 'designifyBridgeToken';

async function getStoredToken() {
  const result = await chrome.storage.local.get(BRIDGE_TOKEN_KEY);
  return typeof result[BRIDGE_TOKEN_KEY] === 'string' ? result[BRIDGE_TOKEN_KEY].trim() : '';
}

async function fetchBridgeHealth(token) {
  const urls = [
    'http://127.0.0.1:3030/api/health',
    'http://localhost:3030/api/health'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }
  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const statusIndicator = document.getElementById('bridge-status-indicator');
  const statusText = document.getElementById('bridge-status-text');
  const statusDot = statusIndicator.querySelector('.status-dot');
  const valClaude = document.getElementById('val-claude');
  const valCodex = document.getElementById('val-codex');
  const btnLaunch = document.getElementById('btn-launch-hud');
  const tokenInput = document.getElementById('bridge-token');
  const saveTokenButton = document.getElementById('save-bridge-token');
  const tokenStatus = document.getElementById('token-status');

  tokenInput.value = await getStoredToken();

  async function checkStatus() {
    statusText.textContent = 'Checking...';
    const data = await fetchBridgeHealth(await getStoredToken());

    if (data && data.status === 'ok' && data.authenticated) {
      statusDot.classList.remove('error');
      statusText.textContent = 'Connected (Port 3030)';
      tokenStatus.textContent = 'Token saved locally in this extension.';

      valClaude.textContent = data.claudeAvailable ? (data.claudeVersion || 'Ready') : 'Not Found';
      valClaude.className = `value ${data.claudeAvailable ? 'badge-success' : 'badge-error'}`;

      valCodex.textContent = data.codexAvailable ? (data.codexVersion || 'Ready') : 'Not Found';
      valCodex.className = `value ${data.codexAvailable ? 'badge-success' : 'badge-error'}`;
    } else if (data && data.requiresAuth) {
      statusDot.classList.add('error');
      statusText.textContent = 'Token required';
      tokenStatus.textContent = 'Paste the token printed by the bridge server.';
      valClaude.textContent = 'Configure token';
      valClaude.className = 'value badge-error';
      valCodex.textContent = 'Configure token';
      valCodex.className = 'value badge-error';
    } else {
      statusDot.classList.add('error');
      statusText.textContent = 'Server Offline';
      tokenStatus.textContent = 'Start node server/index.js, then save its token here.';
      valClaude.textContent = 'Bridge Not Running';
      valClaude.className = 'value badge-error';
      valCodex.textContent = 'Bridge Not Running';
      valCodex.className = 'value badge-error';
    }
  }

  saveTokenButton.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (token.length < 32) {
      tokenStatus.textContent = 'Token must be at least 32 characters.';
      return;
    }
    await chrome.storage.local.set({ [BRIDGE_TOKEN_KEY]: token });
    tokenStatus.textContent = 'Token saved locally in this extension.';
    await checkStatus();
  });

  // Initial check
  await checkStatus();

  // Clicking indicator refreshes status
  statusIndicator.style.cursor = 'pointer';
  statusIndicator.addEventListener('click', () => checkStatus());

  // Activate HUD on active tab
  btnLaunch.addEventListener('click', () => {
    const alertBox = document.getElementById('action-alert');
    if (alertBox) alertBox.style.display = 'none';

    btnLaunch.disabled = true;
    btnLaunch.textContent = 'Injecting HUD...';

    chrome.runtime.sendMessage({ action: 'inject_designify' }, (response) => {
      btnLaunch.disabled = false;
      if (response && response.success) {
        btnLaunch.textContent = '✓ HUD Activated!';
        setTimeout(() => window.close(), 400);
      } else {
        btnLaunch.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Activate HUD on Tab
        `;
        if (alertBox) {
          alertBox.textContent = response?.error || 'Failed to inject HUD. Ensure you are on a standard webpage.';
          alertBox.style.display = 'block';
        }
      }
    });
  });
});
