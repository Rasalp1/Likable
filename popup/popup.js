/**
 * Designify Popup Script
 */

async function fetchBridgeHealth() {
  const urls = [
    'http://127.0.0.1:3030/api/health',
    'http://localhost:3030/api/health'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
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

  async function checkStatus() {
    statusText.textContent = 'Checking...';
    const data = await fetchBridgeHealth();

    if (data && data.status === 'ok') {
      statusDot.classList.remove('error');
      statusText.textContent = 'Connected (Port 3030)';

      valClaude.textContent = data.claudeAvailable ? (data.claudeVersion || 'Ready') : 'Not Found';
      valClaude.className = `value ${data.claudeAvailable ? 'badge-success' : 'badge-error'}`;

      valCodex.textContent = data.codexAvailable ? (data.codexVersion || 'Ready') : 'Not Found';
      valCodex.className = `value ${data.codexAvailable ? 'badge-success' : 'badge-error'}`;
    } else {
      statusDot.classList.add('error');
      statusText.textContent = 'Server Offline';
      valClaude.textContent = 'Bridge Not Running';
      valClaude.className = 'value badge-error';
      valCodex.textContent = 'Bridge Not Running';
      valCodex.className = 'value badge-error';
    }
  }

  // Initial check
  await checkStatus();

  // Clicking indicator refreshes status
  statusIndicator.style.cursor = 'pointer';
  statusIndicator.addEventListener('click', () => checkStatus());

  // Activate HUD on active tab
  btnLaunch.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'inject_designify' }, () => {
      window.close();
    });
  });
});
