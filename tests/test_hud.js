import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const hudSource = readFileSync(new URL('../content/hud.js', import.meta.url), 'utf8');

function fixture() {
  const mounted = [];
  const makeElement = () => ({
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, addEventListener() {}, focus() {},
    querySelector() { return makeElement(); },
    querySelectorAll() { return []; }
  });
  const document = {
    createElement: makeElement,
    documentElement: { appendChild: (el) => mounted.push(el) },
    addEventListener() {},
    getElementById: (id) => mounted.find((el) => el.id === id),
    contains: (el) => mounted.includes(el)
  };
  const context = vm.createContext({ document, window: {}, console: { log() {}, warn() {} }, localStorage: { getItem() { return null; } }, setTimeout, clearTimeout });
  const inject = () => vm.runInContext(hudSource, context);
  return { context, mounted, inject };
}

test('repeated script injection keeps exactly one menu and one launcher', async () => {
  const { context, mounted, inject } = fixture();
  inject();
  await context.window.DesignifyHUD.init();
  const first = context.window.DesignifyHUD;
  inject();
  await context.window.DesignifyHUD.init();
  assert.equal(mounted.filter((el) => el.id === 'designify-hud-root').length, 1);
  assert.equal(mounted.filter((el) => el.id === 'designify-mini-container').length, 1);
  assert.equal(context.window.DesignifyHUD, first);
});

test('concurrent initialization mounts a single set of controls', async () => {
  const { context, mounted, inject } = fixture();
  context.window.DesignifyCache = { cachedList: [], loadDesigns: async () => {} };
  inject();
  await Promise.all([context.window.DesignifyHUD.init(), context.window.DesignifyHUD.init()]);
  assert.equal(mounted.filter((el) => el.id === 'designify-hud-root').length, 1);
});

test('HUD initializes enabled and open as default, and visibility toggle controls surfaces', async () => {
  const { context, mounted, inject } = fixture();
  inject();
  const hud = context.window.DesignifyHUD;
  await hud.init();
  assert.equal(hud.enabled, true);
  assert.equal(hud.isOpen, true);
  assert.equal(hud.hudContainer.style.display, 'block');
  assert.equal(hud.miniFab.style.display, 'flex');
  hud.minimize();
  assert.equal(hud.isOpen, false);
  assert.equal(hud.hudContainer.style.display, 'none');
  assert.equal(hud.miniFab.style.display, 'flex');
  hud.setEnabled(false);
  assert.equal(hud.hudContainer.style.display, 'none');
  assert.equal(hud.miniFab.style.display, 'none');
  assert.equal(hud.enabled, false);
  hud.setEnabled(true);
  assert.equal(hud.enabled, true);
  assert.equal(hud.isOpen, true);
  assert.equal(hud.hudContainer.style.display, 'block');
  assert.equal(hud.miniFab.style.display, 'flex');
  assert.equal(mounted.length, 2);
});

test('background visibility messages reuse the existing HUD without reinjecting', async () => {
  const { context, inject } = fixture();
  inject();
  const hud = context.window.DesignifyHUD;
  await hud.init();
  context.window.DesignifyCoordinator = { init: () => hud.init() };
  let listener;
  let injections = 0;
  const background = vm.createContext({
    chrome: {
      runtime: { onMessage: { addListener: (fn) => { listener = fn; } } },
      tabs: { get: async () => ({ id: 7, url: 'https://example.com/' }) },
      scripting: {
        insertCSS: async () => { injections++; },
        executeScript: async ({ func, args, files }) => {
          if (files) { injections++; return []; }
          context.messageArgs = args || [];
          return [{ result: await vm.runInContext(`(${func.toString()})(...messageArgs)`, context) }];
        }
      }
    }
  });
  vm.runInContext(readFileSync(new URL('../background.js', import.meta.url), 'utf8'), background);
  const send = (action, enabled) => new Promise((resolve) => listener({ action, enabled, tabId: 7 }, {}, resolve));
  assert.equal((await send('get_hud_visibility')).enabled, true);
  assert.equal((await send('set_hud_visibility', false)).enabled, false);
  assert.equal((await send('get_hud_visibility')).enabled, false);
  assert.equal((await send('set_hud_visibility', true)).enabled, true);
  assert.equal(injections, 0);
  assert.equal(context.window.DesignifyHUD, hud);
});

test('cached designs render as preset-style pills instead of horizontal scrollbar', async () => {
  const { context, inject } = fixture();
  context.window.DesignifyCache = {
    cachedList: [
      { id: 'des_linear_1', themeKey: 'linear', themeName: 'Linear', summary: 'Clean dark mode', timeFormatted: '21:00' },
      { id: 'des_apple_2', themeKey: 'apple', themeName: 'Apple', summary: 'Minimal light', timeFormatted: '21:05' }
    ],
    currentActiveId: 'des_apple_2',
    loadDesigns: async () => context.window.DesignifyCache.cachedList
  };
  inject();
  const hud = context.window.DesignifyHUD;
  await hud.init();
  hud.render();
  const html = hud.hudContainer.innerHTML;
  assert.ok(html.includes('designify-designs-grid'), 'renders design pills in flex presets grid');
  assert.ok(!html.includes('designify-history-list'), 'does not render horizontal scrollbar history list');
  assert.ok(html.includes('data-design-id="original"'), 'includes original preset pill');
  assert.ok(html.includes('data-design-id="des_linear_1"'), 'includes first design pill');
  assert.ok(html.includes('data-design-id="des_apple_2"'), 'includes second design pill');
  assert.ok(html.includes('designify-dot-apple'), 'has apple dot style');
  assert.ok(html.includes('designify-dot-linear'), 'has linear dot style');
  assert.ok(html.includes('data-delete-design-id="des_linear_1"'), 'includes delete button for designs');
});

test('HUD does not render provider or model selector in HUD elements', async () => {
  const { context, inject } = fixture();
  inject();
  const hud = context.window.DesignifyHUD;
  await hud.init();
  hud.render();
  const html = hud.hudContainer.innerHTML;

  assert.ok(!html.includes('designify-model-section'), 'does not render model section in HUD');
  assert.ok(!html.includes('designify-model-select'), 'does not render model select dropdown in HUD');
  assert.ok(!html.includes('designify-model-badge'), 'does not render model badge in HUD');
  assert.ok(!html.includes('designify-engine-toggle'), 'does not render engine toggle in HUD');
  assert.ok(!html.includes('designify-engine-btn'), 'does not render engine buttons in HUD');
  assert.ok(!html.includes('designify-effort'), 'does not render effort controls in HUD');
});

test('HUD loads engine, model, and effort preferences transparently from chrome storage', async () => {
  const { context, inject } = fixture();
  const mockStorage = {
    likableSelectedEngine: 'codex',
    likableSelectedModels: { claude: 'claude-sonnet-5', codex: 'gpt-6-luna' },
    likableSelectedEfforts: { claude: 'max', codex: 'xhigh' }
  };
  context.chrome = {
    storage: {
      local: {
        get: async (keys) => {
          if (Array.isArray(keys)) {
            const res = {};
            keys.forEach((k) => { if (mockStorage[k] !== undefined) res[k] = mockStorage[k]; });
            return res;
          }
          return mockStorage;
        },
        set: async (obj) => Object.assign(mockStorage, obj)
      }
    }
  };
  inject();
  const hud = context.window.DesignifyHUD;
  await hud.init();

  assert.equal(hud.selectedEngine, 'codex');
  assert.equal(hud.getModelForEngine('codex'), 'gpt-6-luna');
  assert.equal(hud.getModelForEngine('claude'), 'claude-sonnet-5');
  assert.equal(hud.getModelForEngine(), 'gpt-6-luna');
  assert.equal(hud.getModelDisplayBadge('codex'), '6 Luna');
  assert.equal(hud.getModelDisplayBadge('claude'), 'Sonnet 5');
  assert.equal(hud.getEffortForEngine('codex'), 'xhigh');
  assert.equal(hud.getEffortForEngine('claude'), 'max');
  assert.equal(hud.getEffortForEngine(), 'xhigh');

  // Updating storage reflects on loadEngineAndModelPreferences
  mockStorage.likableSelectedEngine = 'claude';
  mockStorage.likableSelectedModels.claude = 'claude-opus-5-5';
  mockStorage.likableSelectedEfforts.claude = 'high';
  await hud.loadEngineAndModelPreferences();
  assert.equal(hud.selectedEngine, 'claude');
  assert.equal(hud.getModelForEngine(), 'claude-opus-5-5');
  assert.equal(hud.getModelDisplayBadge(), 'Opus 5.5');
  assert.equal(hud.getEffortForEngine(), 'high');
});




