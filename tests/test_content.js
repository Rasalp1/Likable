import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const contentSource = readFileSync(new URL('../content/content.js', import.meta.url), 'utf8');

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

test('bridge server errors (such as 504) report server error without claiming server is offline', async () => {
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
          callback({ success: false, error: 'Bridge server error 504: The claude CLI exceeded the 240000ms timeout.' });
        }
      }
    }
  });

  vm.runInContext(contentSource, context);

  await assert.rejects(
    () => context.window.DesignifyCoordinator.runRedesign({
      theme: 'linear',
      engine: 'claude',
      customPrompt: ''
    }),
    (error) => {
      assert.match(error.message, /Likable Bridge Server at http:\/\/127\.0\.0\.1:3030 error: 504/);
      assert.match(error.message, /The claude CLI exceeded the 240000ms timeout\./);
      assert.doesNotMatch(error.message, /Make sure 'node server\/index\.js' is running/);
      return true;
    }
  );
});

test('runRedesign forwards engine and model preference to background service worker', async () => {
  let capturedPayload = null;
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
        render() {},
        updateProgress() {},
        startSynthesisTicker() {},
        stopSynthesisTicker() {}
      },
      DesignifyOverlay: { init() {}, render() {} },
      DesignifyCache: { saveDesign: async () => {} },
      DesignifyIngester: {
        extractPageData() {
          return {
            url: 'https://example.com/pricing',
            title: 'Pricing',
            metaDescription: 'Plans',
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
          if (message.action === 'call_bridge_redesign') {
            capturedPayload = message.payload;
            callback({
              success: true,
              data: { html: '<div>Redesign</div>', css: '', themeName: 'Linear', summary: 'Done' }
            });
            return;
          }
          callback({ success: false });
        }
      }
    }
  });

  vm.runInContext(contentSource, context);

  await context.window.DesignifyCoordinator.runRedesign({
    theme: 'linear',
    engine: 'claude',
    model: 'claude-sonnet-5',
    effort: 'high',
    customPrompt: 'Refined UI'
  });

  assert.ok(capturedPayload, 'Expected call_bridge_redesign to be called');
  assert.equal(capturedPayload.engine, 'claude');
  assert.equal(capturedPayload.model, 'claude-sonnet-5');
  assert.equal(capturedPayload.effort, 'high');
  assert.equal(capturedPayload.theme, 'linear');
  assert.equal(capturedPayload.customPrompt, 'Refined UI');
});


