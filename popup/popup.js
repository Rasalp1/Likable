/**
 * Designify Popup Script
 */

const BRIDGE_HEALTH_URL = 'http://127.0.0.1:3030/api/health';

document.addEventListener('DOMContentLoaded', async () => {
  const statusIndicator = document.getElementById('bridge-status-indicator');
  const statusText = document.getElementById('bridge-status-text');
  const statusDot = statusIndicator.querySelector('.status-dot');
  const valClaude = document.getElementById('val-claude');
  const valCodex = document.getElementById('val-codex');
  const btnLaunch = document.getElementById('btn-launch-hud');

  // Check bridge health
  try {
    const res = await fetch(BRIDGE_HEALTH_URL);
    if (!res.ok) throw new Error('Bridge server returned error');
    const data = await res.json();

    statusDot.classList.remove('error');
    statusText.textContent = 'Connected';

    valClaude.textContent = data.claudeAvailable ? 'Ready' : 'Not Found';
    valClaude.className = `value ${data.claudeAvailable ? 'badge-success' : 'badge-error'}`;

    valCodex.textContent = data.codexAvailable ? 'Ready' : 'Not Found';
    valCodex.className = `value ${data.codexAvailable ? 'badge-success' : 'badge-error'}`;

  } catch (err) {
    statusDot.classList.add('error');
    statusText.textContent = 'Disconnected';
    valClaude.textContent = 'Offline';
    valClaude.className = 'value badge-error';
    valCodex.textContent = 'Offline';
    valCodex.className = 'value badge-error';
  }

  // Activate HUD on active tab
  btnLaunch.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'inject_designify' }, (response) => {
      window.close();
    });
  });
});
