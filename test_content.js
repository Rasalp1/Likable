import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const contentSource = readFileSync(new URL('./content/content.js', import.meta.url), 'utf8');

function fixture() {
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    document: {
      readyState: 'complete',
      addEventListener() {},
      getElementById() { return null; },
      createElement() { return {}; },
      head: { appendChild() {} }
    },
    window: {
      DesignifyHUD: {
        async init() {},
        updateProgress() {},
        startSynthesisTicker() {},
        stopSynthesisTicker() {}
      },
      DesignifyOverlay: { init() {} },
      DesignifyIngester: {
        extractPageData() {
          return {
            url: 'https://example.com/',
            title: 'Example',
            metaDescription: '',
            domTree: []
          };
        }
      }
    },
    chrome: {
      runtime: {
        getURL: (path) => `chrome-extension://test/${path}`,
        sendMessage(message, callback) {
          if (message.action === 'capture_visible_tab') {
            callback({ success: true, dataUrl: null });
            return;
          }
          callback({ success: false, error: 'Bridge offline' });
        }
      }
    }
  });

  vm.runInContext(contentSource, context);
  return context;
}

test('bridge failures include the local bridge address in the user-facing error', async () => {
  const context = fixture();

  await assert.rejects(
    () => context.window.DesignifyCoordinator.runRedesign({
      theme: 'linear',
      engine: 'claude',
      customPrompt: ''
    }),
    (error) => {
      assert.match(error.message, /127\.0\.0\.1:3030/);
      assert.match(error.message, /Bridge offline/);
      return true;
    }
  );
});
