/**
 * Designify - Design Cache & History Manager
 * Persists generated redesigns in chrome.storage.local (with localStorage fallback)
 * allowing instant switching between designs without calling AI again.
 */

window.DesignifyCache = {
  currentActiveId: null,
  cachedList: [],

  getStorageKey() {
    // Key by origin and pathname so query params don't fragment history unnecessarily
    return `designify_designs_${window.location.origin}${window.location.pathname}`;
  },

  /**
   * Loads cached designs from storage
   */
  async loadDesigns() {
    const key = this.getStorageKey();

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get([key]);
        this.cachedList = result[key] || [];
      } else {
        const raw = localStorage.getItem(key);
        this.cachedList = raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      console.warn('[Designify Cache] Failed to load from chrome.storage:', e);
      try {
        const raw = localStorage.getItem(key);
        this.cachedList = raw ? JSON.parse(raw) : [];
      } catch {}
    }

    return this.cachedList;
  },

  /**
   * Saves a newly generated redesign to the cache
   */
  async saveDesign(redesign) {
    const key = this.getStorageKey();

    const entry = {
      id: redesign.id || `des_${Date.now()}`,
      themeKey: redesign.themeKey || 'custom',
      themeName: redesign.themeName || 'Modern Redesign',
      summary: redesign.summary || '',
      customPrompt: redesign.customPrompt || '',
      engineUsed: redesign.engineUsed || 'claude',
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      html: redesign.html,
      css: redesign.css
    };

    // Filter out duplicate if existing with same id
    this.cachedList = this.cachedList.filter((d) => d.id !== entry.id);

    // Add to top of list
    this.cachedList.unshift(entry);

    // Keep max 10 designs per page to respect storage quotas
    if (this.cachedList.length > 10) {
      this.cachedList = this.cachedList.slice(0, 10);
    }

    this.currentActiveId = entry.id;

    // Persist
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [key]: this.cachedList });
      }
      localStorage.setItem(key, JSON.stringify(this.cachedList));
    } catch (e) {
      console.warn('[Designify Cache] Save error:', e);
    }

    console.log(`[Designify Cache] Saved design "${entry.themeName}" (${entry.id}). Total cached: ${this.cachedList.length}`);
    return entry;
  },

  /**
   * Retrieves a specific design by ID
   */
  getDesignById(id) {
    return this.cachedList.find((d) => d.id === id) || null;
  },

  /**
   * Deletes a specific design
   */
  async deleteDesign(id) {
    const key = this.getStorageKey();
    this.cachedList = this.cachedList.filter((d) => d.id !== id);

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [key]: this.cachedList });
      }
      localStorage.setItem(key, JSON.stringify(this.cachedList));
    } catch {}

    if (this.currentActiveId === id) {
      this.currentActiveId = this.cachedList.length > 0 ? this.cachedList[0].id : null;
    }

    return this.cachedList;
  },

  /**
   * Clears all cached designs for the current page
   */
  async clearAll() {
    const key = this.getStorageKey();
    this.cachedList = [];
    this.currentActiveId = null;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove([key]);
      }
      localStorage.removeItem(key);
    } catch {}
  }
};
