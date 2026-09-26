/**
 * Quick verification for Codex engine in Designify Bridge
 */
async function testCodex() {
  console.log('Testing Codex Engine via Bridge Server...');
  const payload = {
    url: 'https://test-dashboard.local',
    title: 'Codex Test Dashboard',
    theme: 'bento-grid',
    engine: 'codex',
    domTree: [
      { mirrorId: 'd-1', tag: 'header', text: 'Codex Engine Test' },
      { mirrorId: 'd-2', tag: 'input', type: 'text', placeholder: 'Codex search...' },
      { mirrorId: 'd-3', tag: 'button', text: 'Codex Button', isInteractive: true }
    ]
  };

  const res = await fetch('http://127.0.0.1:3030/api/redesign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Codex test result status:', res.status);
  console.log('Success:', data.success);
  console.log('Engine used:', data.engineUsed);
  console.log('HTML Length:', data.html?.length);
  console.log('CSS Length:', data.css?.length);
}

testCodex().catch(console.error);
