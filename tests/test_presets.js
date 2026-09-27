import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { THEME_PRESETS, THEME_MANDATES, buildRedesignPrompt } from '../server/prompts.js';

const REQUIRED_PRESET_KEYS = [
  'id',
  'label',
  'name',
  'isCustom',
  'originUrl',
  'createdAt',
  'description',
  'palette',
  'layout',
  'geometry',
  'padding',
  'elevation',
  'typography',
  'mandate'
];

const REQUIRED_PALETTE_KEYS = [
  'background',
  'surface',
  'surfaceHover',
  'border',
  'textPrimary',
  'textSecondary',
  'accent',
  'accentGlow'
];

const REQUIRED_LAYOUT_KEYS = ['containerMaxWidth', 'sectionSpacingY', 'layoutStructure'];
const REQUIRED_GEOMETRY_KEYS = ['cardRadius', 'buttonRadius'];
const REQUIRED_PADDING_KEYS = ['cardPadding', 'buttonPadding', 'sectionSpacingY'];
const REQUIRED_ELEVATION_KEYS = ['cardShadow', 'cardBorder', 'backdropFilter'];
const REQUIRED_TYPOGRAPHY_KEYS = ['headingFont', 'bodyFont', 'headingWeight', 'headingTracking'];

function assertPresetStructure(preset, { isCustom = false } = {}) {
  for (const key of REQUIRED_PRESET_KEYS) {
    assert.ok(key in preset, `Preset "${preset.name || preset.id}" is missing key "${key}"`);
  }

  assert.equal(typeof preset.id, 'string');
  assert.equal(typeof preset.label, 'string');
  assert.equal(typeof preset.name, 'string');
  assert.equal(typeof preset.isCustom, 'boolean');
  assert.equal(preset.isCustom, isCustom);
  assert.equal(typeof preset.originUrl, 'string');
  assert.equal(typeof preset.createdAt, 'number');
  assert.equal(typeof preset.description, 'string');
  assert.equal(typeof preset.mandate, 'string');

  // Palette
  for (const k of REQUIRED_PALETTE_KEYS) {
    assert.ok(k in preset.palette, `Palette missing key "${k}"`);
  }

  // Layout
  for (const k of REQUIRED_LAYOUT_KEYS) {
    assert.ok(k in preset.layout, `Layout missing key "${k}"`);
  }

  // Geometry
  for (const k of REQUIRED_GEOMETRY_KEYS) {
    assert.ok(k in preset.geometry, `Geometry missing key "${k}"`);
  }

  // Padding
  for (const k of REQUIRED_PADDING_KEYS) {
    assert.ok(k in preset.padding, `Padding missing key "${k}"`);
  }

  // Elevation
  for (const k of REQUIRED_ELEVATION_KEYS) {
    assert.ok(k in preset.elevation, `Elevation missing key "${k}"`);
  }

  // Typography
  for (const k of REQUIRED_TYPOGRAPHY_KEYS) {
    assert.ok(k in preset.typography, `Typography missing key "${k}"`);
  }

  // Anti-AI mandate requirements
  assert.match(
    preset.mandate,
    /MUST NOT look AI-generated/i,
    `Preset "${preset.name}" mandate must instruct the model not to look AI-generated`
  );
  assert.match(
    preset.mandate,
    /generic AI cl[ií]ch[eé]s/i,
    `Preset "${preset.name}" mandate must warn against generic AI clichés`
  );
}

test('server THEME_PRESETS follow the complete preset structure content-wise', () => {
  const defaultKeys = ['linear', 'apple', 'lovable'];
  assert.deepEqual(Object.keys(THEME_PRESETS).sort(), defaultKeys.sort());

  for (const key of defaultKeys) {
    const preset = THEME_PRESETS[key];
    assert.equal(preset.id, key);
    assertPresetStructure(preset, { isCustom: false });
  }

  // Lovable preset is vibrant and colorful with pink, purple, and blue
  const lovable = THEME_PRESETS.lovable;
  assert.match(lovable.mandate, /pink/i);
  assert.match(lovable.mandate, /purple/i);
  assert.match(lovable.mandate, /blue/i);
  assert.equal(lovable.palette.pink, '#ec4899');
  assert.equal(lovable.palette.purple, '#a855f7');
  assert.equal(lovable.palette.blue, '#3b82f6');
});

test('HUD defaultPresets follow the complete preset structure content-wise', () => {
  const hudSource = readFileSync(new URL('../content/hud.js', import.meta.url), 'utf8');
  const makeElement = () => ({
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    addEventListener() {},
    focus() {},
    querySelector() { return makeElement(); },
    querySelectorAll() { return []; }
  });
  const context = vm.createContext({
    document: {
      createElement: makeElement,
      documentElement: { appendChild() {} },
      addEventListener() {},
      getElementById() { return null; },
      contains() { return false; }
    },
    window: {},
    console: { log() {}, warn() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout,
    clearTimeout
  });

  vm.runInContext(hudSource, context);
  const hud = context.window.DesignifyHUD;
  assert.ok(hud, 'DesignifyHUD must be mounted on window');
  assert.equal(hud.defaultPresets.length, 3);

  for (const preset of hud.defaultPresets) {
    assertPresetStructure(preset, { isCustom: false });
  }

  // Check presets array
  assert.equal(hud.presets.length, 3);
  for (const preset of hud.presets) {
    assertPresetStructure(preset, { isCustom: false });
  }

  const hudLovable = hud.defaultPresets.find((p) => p.id === 'lovable');
  assert.ok(hudLovable);
  assert.match(hudLovable.mandate, /pink/i);
  assert.match(hudLovable.mandate, /purple/i);
  assert.match(hudLovable.mandate, /blue/i);
  assert.equal(hudLovable.palette.pink, '#ec4899');
  assert.equal(hudLovable.palette.purple, '#a855f7');
  assert.equal(hudLovable.palette.blue, '#3b82f6');
});

test('ingester extractDesignPreset generates presets with complete structure and anti-AI-generated mandate', () => {
  const ingesterSource = readFileSync(new URL('../content/ingester.js', import.meta.url), 'utf8');

  const makeEl = (tag = 'div', style = {}) => ({
    tagName: tag.toUpperCase(),
    style: { ...style },
    getBoundingClientRect: () => ({ width: 800, height: 600, top: 0, left: 0 }),
    closest: () => null,
    querySelectorAll: () => []
  });

  const bodyEl = makeEl('body', { backgroundColor: '#111827', fontFamily: 'Inter', lineHeight: '1.6' });
  const h1El = makeEl('h1', {
    color: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: '-0.025em',
    lineHeight: '1.15'
  });
  const buttonEl = makeEl('button', {
    backgroundColor: '#3b82f6',
    borderRadius: '8px',
    paddingTop: '10px',
    paddingRight: '20px',
    fontWeight: '600'
  });

  const context = vm.createContext({
    document: {
      title: 'Acme Studio - Handcrafted Hardware',
      body: bodyEl,
      documentElement: bodyEl,
      querySelector: (selector) => {
        if (selector === 'h1') return h1El;
        if (selector === 'p') return makeEl('p', { color: '#9ca3af' });
        return null;
      },
      querySelectorAll: (selector) => {
        if (selector.includes('h1')) return [h1El];
        if (selector.includes('button')) return [buttonEl];
        if (selector.includes('article') || selector.includes('.card')) return [makeEl('div', { borderRadius: '12px', paddingTop: '24px', paddingRight: '24px', backgroundColor: 'rgba(255,255,255,0.05)' })];
        if (selector.includes('section')) return [makeEl('section', { paddingTop: '80px', paddingBottom: '80px' })];
        if (selector.includes('container')) return [makeEl('div', { maxWidth: '1200px' })];
        return [];
      }
    },
    window: {
      location: { origin: 'https://acme.example.com', hostname: 'acme.example.com' },
      getComputedStyle: (el) => ({
        backgroundColor: el.style?.backgroundColor || 'rgba(0, 0, 0, 0)',
        color: el.style?.color || '#ffffff',
        fontFamily: el.style?.fontFamily || 'Inter',
        fontWeight: el.style?.fontWeight || '400',
        letterSpacing: el.style?.letterSpacing || 'normal',
        lineHeight: el.style?.lineHeight || '1.5',
        borderRadius: el.style?.borderRadius || '0px',
        paddingTop: el.style?.paddingTop || '0px',
        paddingRight: el.style?.paddingRight || '0px',
        paddingBottom: el.style?.paddingBottom || '0px',
        paddingLeft: el.style?.paddingLeft || '0px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'none',
        maxWidth: el.style?.maxWidth || 'none'
      })
    },
    console: { log() {}, warn() {} }
  });

  vm.runInContext(ingesterSource, context);
  const ingester = context.window.DesignifyIngester;
  assert.ok(ingester, 'DesignifyIngester must be defined');

  const generatedPreset = ingester.extractDesignPreset();
  assertPresetStructure(generatedPreset, { isCustom: true });

  assert.equal(generatedPreset.label, 'Acme Studio');
  assert.equal(generatedPreset.name, 'Acme Studio');
  assert.equal(generatedPreset.originUrl, 'https://acme.example.com');
  assert.match(generatedPreset.mandate, /MUST NOT look AI-generated/i);
  assert.match(generatedPreset.mandate, /generic AI cl[ií]ch[eé]s/i);
  assert.match(generatedPreset.mandate, /Acme Studio/);
});

test('buildRedesignPrompt incorporates design tokens and anti-AI instructions for default and custom presets', () => {
  // Test with default linear preset
  const linearPrompt = buildRedesignPrompt({
    url: 'https://example.com',
    title: 'Example',
    metaDescription: 'A test page',
    themeKey: 'linear',
    domTree: []
  });

  assert.match(linearPrompt, /Target Visual Theme: Linear/);
  assert.match(linearPrompt, /MUST NOT look AI-generated/i);
  assert.match(linearPrompt, /generic AI cl[ií]ch[eé]s/i);
  assert.match(linearPrompt, /Theme Design System Tokens/);
  assert.match(linearPrompt, /Layout: Max-width 1360px/);

  // Test with default lovable preset
  const lovablePrompt = buildRedesignPrompt({
    url: 'https://example.com',
    title: 'Example',
    metaDescription: 'A test page',
    themeKey: 'lovable',
    domTree: []
  });

  assert.match(lovablePrompt, /Target Visual Theme: Lovable/);
  assert.match(lovablePrompt, /MUST NOT look AI-generated/i);
  assert.match(lovablePrompt, /Layout: Max-width 1480px/);
  assert.match(lovablePrompt, /Card Radius 12px/);
  assert.match(lovablePrompt, /pink/i);
  assert.match(lovablePrompt, /purple/i);
  assert.match(lovablePrompt, /blue/i);

  // Test with a custom preset
  const customPreset = {
    id: 'preset-stripe-123',
    label: 'Stripe',
    name: 'Stripe',
    isCustom: true,
    originUrl: 'https://stripe.com',
    createdAt: Date.now(),
    description: 'Extracted Stripe design system',
    palette: {
      background: '#0a2540',
      surface: '#ffffff',
      surfaceHover: '#f6f9fc',
      border: 'rgba(0, 0, 0, 0.08)',
      textPrimary: '#0a2540',
      textSecondary: '#425466',
      accent: '#635bff',
      accentGlow: 'rgba(99, 91, 255, 0.2)'
    },
    layout: {
      containerMaxWidth: '1080px',
      sectionSpacingY: '120px',
      layoutStructure: 'structured-sections'
    },
    geometry: {
      cardRadius: '8px',
      buttonRadius: '4px'
    },
    padding: {
      cardPadding: '32px 32px',
      buttonPadding: '8px 16px',
      sectionSpacingY: '120px'
    },
    elevation: {
      cardShadow: '0 13px 27px -5px rgba(50, 50, 93, 0.25)',
      cardBorder: '1px solid rgba(0, 0, 0, 0.08)',
      backdropFilter: 'none'
    },
    typography: {
      headingFont: 'Söhne',
      bodyFont: 'Söhne',
      headingWeight: '600',
      headingTracking: '-0.02em'
    },
    mandate: `
### 🚨 MANDATORY STRIPE DESIGN SYSTEM EXECUTION (NON-NEGOTIABLE):
1. **Light Mode Atmosphere & Canvas**:
   - Canvas: #0a2540
2. **Bespoke Human Craft & Anti-AI-Generated Discipline (MANDATORY)**:
   - MUST NOT look AI-generated: Strictly avoid generic AI clichés and generic purple neon glow blobs.
`
  };

  const customPromptResult = buildRedesignPrompt({
    url: 'https://example.com',
    title: 'Example',
    metaDescription: 'A test page',
    themeKey: customPreset.id,
    customPreset,
    domTree: []
  });

  assert.match(customPromptResult, /Target Visual Theme: Stripe/);
  assert.match(customPromptResult, /Layout: Max-width 1080px/);
  assert.match(customPromptResult, /Card Radius 8px/);
  assert.match(customPromptResult, /MUST NOT look AI-generated/i);
});

test('HUD loadCustomPresets purges custom presets matching Linear and Lovable', async () => {
  const hudSource = readFileSync(new URL('../content/hud.js', import.meta.url), 'utf8');
  let stored = [
    { id: 'preset-linear-123', name: 'Linear', originUrl: 'https://linear.app' },
    { id: 'preset-lovable-456', name: 'Lovable', originUrl: 'https://lovable.dev' },
    { id: 'preset-mckinsey-789', name: 'Mckinsey', originUrl: 'https://www.mckinsey.com' }
  ];

  const context = vm.createContext({
    document: {
      createElement: () => ({
        style: {},
        dataset: {},
        classList: { add() {}, remove() {}, toggle() {} },
        setAttribute() {},
        addEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; }
      }),
      documentElement: { appendChild() {} },
      addEventListener() {},
      getElementById() { return null; },
      contains() { return false; }
    },
    window: {},
    console: { log() {}, warn() {} },
    localStorage: {
      getItem(key) { return JSON.stringify(stored); },
      setItem(key, val) { stored = JSON.parse(val); }
    },
    setTimeout,
    clearTimeout
  });

  vm.runInContext(hudSource, context);
  const hud = context.window.DesignifyHUD;
  await hud.loadCustomPresets();

  assert.equal(hud.customPresets.length, 1);
  assert.equal(hud.customPresets[0].name, 'Mckinsey');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].name, 'Mckinsey');
});

test('DesignifyCache keys by total URL and distinguishes routes, query params, and hash fragments', async () => {
  const cacheSource = readFileSync(new URL('../content/cache.js', import.meta.url), 'utf8');
  const storage = {};
  const context = vm.createContext({
    window: {
      location: {
        origin: 'https://app.example.com',
        pathname: '/dashboard',
        search: '?tab=billing',
        hash: '#invoices',
        href: 'https://app.example.com/dashboard?tab=billing#invoices'
      }
    },
    console: { log() {}, warn() {} },
    localStorage: {
      getItem(k) { return storage[k] ?? null; },
      setItem(k, v) { storage[k] = String(v); },
      removeItem(k) { delete storage[k]; }
    }
  });

  vm.runInContext(cacheSource, context);
  const cache = context.window.DesignifyCache;
  assert.ok(cache, 'DesignifyCache must be mounted on window');
  assert.equal(context.window.LikableCache, cache, 'LikableCache alias must match DesignifyCache');
  assert.equal(context.window.LikeableCache, cache, 'LikeableCache alias must match DesignifyCache');

  // Verify key format
  const key = cache.getStorageKey();
  assert.equal(key, 'likable_designs_https://app.example.com/dashboard?tab=billing#invoices');

  // Save a design for route 1
  await cache.saveDesign({
    id: 'des-1',
    themeName: 'Billing Theme',
    html: '<div>Billing</div>',
    css: 'body { color: blue; }'
  });

  assert.equal(cache.cachedList.length, 1);
  assert.equal(cache.cachedList[0].url, 'https://app.example.com/dashboard?tab=billing#invoices');
  assert.ok(storage[key], 'Must be persisted in storage under total URL key');

  // Switch route to /dashboard?tab=analytics
  context.window.location = {
    origin: 'https://app.example.com',
    pathname: '/dashboard',
    search: '?tab=analytics',
    hash: '',
    href: 'https://app.example.com/dashboard?tab=analytics'
  };

  const key2 = cache.getStorageKey();
  assert.equal(key2, 'likable_designs_https://app.example.com/dashboard?tab=analytics');

  // Load designs for new route - should be empty initially
  await cache.loadDesigns();
  assert.equal(cache.cachedList.length, 0);

  // Save design for route 2
  await cache.saveDesign({
    id: 'des-2',
    themeName: 'Analytics Theme',
    html: '<div>Analytics</div>',
    css: 'body { color: green; }'
  });
  assert.equal(cache.cachedList.length, 1);

  // Switch back to route 1 - must load route 1's design
  context.window.location = {
    origin: 'https://app.example.com',
    pathname: '/dashboard',
    search: '?tab=billing',
    hash: '#invoices',
    href: 'https://app.example.com/dashboard?tab=billing#invoices'
  };
  await cache.loadDesigns();
  assert.equal(cache.cachedList.length, 1);
  assert.equal(cache.cachedList[0].id, 'des-1');
  assert.equal(cache.cachedList[0].themeName, 'Billing Theme');
});

test('DesignifyCache falls back to legacy origin+pathname keys when total URL key is empty', async () => {
  const cacheSource = readFileSync(new URL('../content/cache.js', import.meta.url), 'utf8');
  const legacyPathKey = 'likeable_designs_https://example.com/docs';
  const legacyData = [{ id: 'des-legacy', themeName: 'Legacy Redesign', html: '<p>Old</p>', css: '' }];
  const storage = { [legacyPathKey]: JSON.stringify(legacyData) };

  const context = vm.createContext({
    window: {
      location: {
        origin: 'https://example.com',
        pathname: '/docs',
        search: '?v=2',
        href: 'https://example.com/docs?v=2'
      }
    },
    console: { log() {}, warn() {} },
    localStorage: {
      getItem(k) { return storage[k] ?? null; },
      setItem(k, v) { storage[k] = String(v); },
      removeItem(k) { delete storage[k]; }
    }
  });

  vm.runInContext(cacheSource, context);
  const cache = context.window.DesignifyCache;
  await cache.loadDesigns();
  assert.equal(cache.cachedList.length, 1);
  assert.equal(cache.cachedList[0].id, 'des-legacy');
});

test('ingester extractDesignPreset uses total URL and route-specific label when on a sub-route', () => {
  const ingesterSource = readFileSync(new URL('../content/ingester.js', import.meta.url), 'utf8');

  const makeEl = (tag = 'div', style = {}) => ({
    tagName: tag.toUpperCase(),
    style: { ...style },
    getBoundingClientRect: () => ({ width: 800, height: 600, top: 0, left: 0 }),
    closest: () => null,
    querySelectorAll: () => []
  });

  const bodyEl = makeEl('body', { backgroundColor: '#0f172a', fontFamily: 'Inter' });
  const h1El = makeEl('h1', { color: '#ffffff', fontFamily: 'Inter', fontWeight: '700' });

  const context = vm.createContext({
    document: {
      title: 'Linear - Streamline your product roadmap',
      body: bodyEl,
      documentElement: bodyEl,
      querySelector: (selector) => (selector === 'h1' ? h1El : null),
      querySelectorAll: () => []
    },
    window: {
      location: {
        origin: 'https://linear.app',
        hostname: 'linear.app',
        pathname: '/pricing',
        search: '?cycle=annual',
        hash: '',
        href: 'https://linear.app/pricing?cycle=annual'
      },
      getComputedStyle: () => ({
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontFamily: 'Inter',
        fontWeight: '600',
        letterSpacing: '-0.02em',
        lineHeight: '1.2',
        borderRadius: '10px',
        paddingTop: '12px',
        paddingRight: '24px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'rgba(255,255,255,0.1)',
        boxShadow: 'none',
        backdropFilter: 'none'
      })
    },
    console: { log() {}, warn() {} }
  });

  vm.runInContext(ingesterSource, context);
  const ingester = context.window.DesignifyIngester;
  const preset = ingester.extractDesignPreset();

  assert.equal(preset.originUrl, 'https://linear.app/pricing?cycle=annual', 'originUrl must be total URL');
  assert.equal(preset.url, 'https://linear.app/pricing?cycle=annual', 'url must be total URL');
  assert.match(preset.mandate, /https:\/\/linear\.app\/pricing\?cycle=annual/);
  assert.match(preset.description, /https:\/\/linear\.app\/pricing\?cycle=annual/);
  assert.ok(preset.id.includes('pricing'), 'preset ID should incorporate route slug');
});

test('HUD saveCustomPreset allows multiple presets from different routes of the same domain', async () => {
  const hudSource = readFileSync(new URL('../content/hud.js', import.meta.url), 'utf8');
  let stored = [];

  const context = vm.createContext({
    document: {
      createElement: () => ({
        style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
        setAttribute() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }
      }),
      documentElement: { appendChild() {} },
      addEventListener() {}, getElementById() { return null; }, contains() { return false; }
    },
    window: {},
    console: { log() {}, warn() {} },
    localStorage: {
      getItem() { return JSON.stringify(stored); },
      setItem(key, val) { stored = JSON.parse(val); }
    },
    setTimeout, clearTimeout
  });

  vm.runInContext(hudSource, context);
  const hud = context.window.DesignifyHUD;
  await hud.loadCustomPresets();

  // Save preset from route /pricing
  await hud.saveCustomPreset({
    id: 'preset-acme-pricing',
    name: 'Acme',
    label: 'Acme (Pricing)',
    originUrl: 'https://acme.example.com/pricing',
    isCustom: true
  });
  assert.equal(hud.customPresets.length, 1);

  // Save preset from route /blog on same domain
  await hud.saveCustomPreset({
    id: 'preset-acme-blog',
    name: 'Acme',
    label: 'Acme (Blog)',
    originUrl: 'https://acme.example.com/blog',
    isCustom: true
  });
  // Both must coexist because they have distinct routes!
  assert.equal(hud.customPresets.length, 2);
  assert.equal(hud.customPresets[0].originUrl, 'https://acme.example.com/blog');
  assert.equal(hud.customPresets[1].originUrl, 'https://acme.example.com/pricing');

  // Updating the exact same route (/blog) updates in place without duplicating
  await hud.saveCustomPreset({
    id: 'preset-acme-blog',
    name: 'Acme',
    label: 'Acme (Blog Updated)',
    originUrl: 'https://acme.example.com/blog',
    isCustom: true
  });
  assert.equal(hud.customPresets.length, 2);
  assert.equal(hud.customPresets[0].label, 'Acme (Blog Updated)');
});
