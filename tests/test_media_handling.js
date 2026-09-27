import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { buildRedesignPrompt } from '../server/prompts.js';

const overlaySource = readFileSync(new URL('../content/overlay.js', import.meta.url), 'utf8');
const ingesterSource = readFileSync(new URL('../content/ingester.js', import.meta.url), 'utf8');

function createOverlayContext() {
  const elements = [];
  const fakeDOMParser = function() {};
  fakeDOMParser.prototype.parseFromString = function(htmlStr) {
    // Basic DOM tree mock for vm
    const nodes = [];
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const cleanHtml = htmlStr.replace(scriptRegex, '');
    
    // Simple parser simulation for testing sanitizeHtml
    return {
      querySelectorAll(selector) {
        return [];
      },
      body: {
        innerHTML: cleanHtml,
        querySelectorAll(selector) {
          return [];
        }
      }
    };
  };

  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    window: {
      location: {
        href: 'https://example.com/products/item',
        origin: 'https://example.com'
      }
    },
    document: {
      createElement() { return {}; },
      contains() { return false; },
      body: { appendChild() {} },
      documentElement: { appendChild() {} }
    },
    URL,
    DOMParser: typeof DOMParser !== 'undefined' ? DOMParser : undefined
  });

  return context;
}

test('buildRedesignPrompt includes the image and video preservation mandate', () => {
  const prompt = buildRedesignPrompt({
    url: 'https://example.com',
    title: 'Store',
    metaDescription: 'Shop online',
    themeKey: 'linear',
    domTree: [
      { mirrorId: 'd-1', tag: 'img', src: 'https://cdn.example.com/hero.jpg', alt: 'Hero image' },
      { mirrorId: 'd-2', tag: 'video', src: 'https://cdn.example.com/demo.mp4', poster: 'https://cdn.example.com/poster.jpg' }
    ]
  });

  assert.match(prompt, /Preserve and Showcase Original Images & Media Assets/i);
  assert.match(prompt, /Retain Exact URLs/i);
  assert.match(prompt, /Video Elements/i);
  assert.match(prompt, /Media Mirror IDs/i);
});

test('sanitizeCss preserves safe CDN URLs and data URIs while neutralizing dangerous schemes', () => {
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    window: {
      location: {
        href: 'https://example.com/page',
        origin: 'https://example.com'
      }
    },
    document: {
      createElement() { return {}; },
      contains() { return false; },
      body: { appendChild() {} },
      documentElement: { appendChild() {} }
    },
    URL
  });

  vm.runInContext(overlaySource, context);
  const overlay = context.window.DesignifyOverlay;

  // Safe CDN URL
  const safeCss = overlay.sanitizeCss('.hero { background-image: url("https://cdn.shopify.com/hero.jpg"); }');
  assert.match(safeCss, /url\("https:\/\/cdn\.shopify\.com\/hero\.jpg"\)/);

  // Safe relative URL resolved against window.location
  const relativeCss = overlay.sanitizeCss('.banner { background: url("/assets/banner.png"); }');
  assert.match(relativeCss, /url\("https:\/\/example\.com\/assets\/banner\.png"\)/);

  // Safe data URI
  const dataUriCss = overlay.sanitizeCss('.icon { background: url("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="); }');
  assert.match(dataUriCss, /data:image\/svg\+xml;base64/);

  // Dangerous javascript: neutralized to none
  const dangerousCss = overlay.sanitizeCss('.bad { background: url("javascript:alert(1)"); }');
  assert.doesNotMatch(dangerousCss, /javascript/);
  assert.match(dangerousCss, /none/);
});

test('ingester prioritizes visual media nodes so images and videos are not truncated', () => {
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    window: {
      location: {
        href: 'https://store.example.com/catalog',
        origin: 'https://store.example.com'
      },
      getComputedStyle: () => ({
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        fontFamily: 'Inter, sans-serif',
        backgroundImage: 'none'
      })
    },
    document: {
      title: 'Store Catalog',
      body: {},
      querySelector: () => null,
      querySelectorAll: (sel) => {
        if (sel === '[data-mirror-id]') {
          return [
            {
              getAttribute: (name) => {
                if (name === 'data-mirror-id') return 'd-1';
                if (name === 'src') return '/images/product.jpg';
                if (name === 'alt') return 'Sneaker';
                return null;
              },
              tagName: 'IMG',
              currentSrc: 'https://cdn.example.com/product.jpg',
              getBoundingClientRect: () => ({ width: 400, height: 300 }),
              innerText: '',
              parentElement: null
            },
            {
              getAttribute: (name) => {
                if (name === 'data-mirror-id') return 'd-2';
                if (name === 'src') return 'https://cdn.example.com/demo.mp4';
                if (name === 'poster') return 'https://cdn.example.com/poster.jpg';
                return null;
              },
              hasAttribute: (name) => ['autoplay', 'controls', 'muted'].includes(name),
              tagName: 'VIDEO',
              currentSrc: 'https://cdn.example.com/demo.mp4',
              poster: 'https://cdn.example.com/poster.jpg',
              getBoundingClientRect: () => ({ width: 800, height: 450 }),
              innerText: '',
              parentElement: null,
              querySelector: () => null
            }
          ];
        }
        return [];
      }
    },
    URL
  });

  vm.runInContext(ingesterSource, context);
  const pageData = context.window.DesignifyIngester.extractPageData();

  assert.equal(pageData.domTree.length, 2);
  const imgNode = pageData.domTree.find((n) => n.tag === 'img');
  assert.ok(imgNode);
  assert.equal(imgNode.src, 'https://cdn.example.com/product.jpg');
  assert.equal(imgNode.alt, 'Sneaker');
  assert.equal(imgNode.width, 400);

  const videoNode = pageData.domTree.find((n) => n.tag === 'video');
  assert.ok(videoNode);
  assert.equal(videoNode.src, 'https://cdn.example.com/demo.mp4');
  assert.equal(videoNode.poster, 'https://cdn.example.com/poster.jpg');
  assert.equal(videoNode.autoplay, true);
  assert.equal(videoNode.muted, true);
});
