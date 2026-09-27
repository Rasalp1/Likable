/**
 * Likable - Design Cache & History Manager
 * Persists generated redesigns in chrome.storage.local (with localStorage fallback)
 * allowing instant switching between designs without calling AI again.
 */

window.LikableCache = window.LikeableCache = window.DesignifyCache =
  window.LikableCache || window.LikeableCache || window.DesignifyCache || {
  currentActiveId: null,
  cachedList: [],

  getTotalUrl(url) {
    if (url && typeof url === 'string') return url.trim();
    try {
      if (typeof window !== 'undefined' && window.location) {
        return (
          window.location.href ||
          `${window.location.origin || ''}${window.location.pathname || ''}${window.location.search || ''}${window.location.hash || ''}`
        ).trim();
      }
    } catch {}
    return '';
  },

  getStorageKey(url) {
    const totalUrl = this.getTotalUrl(url);
    // Key by total URL so query params, routes, and hash paths maintain distinct redesign history
    return `likable_designs_${totalUrl}`;
  },

  getLegacyStorageKey(url) {
    const totalUrl = this.getTotalUrl(url);
    return `likeable_designs_${totalUrl}`;
  },

  getLegacyStorageKeys(url) {
    const totalUrl = this.getTotalUrl(url);
    return [
      `likeable_designs_${totalUrl}`,
      `designify_designs_${totalUrl}`
    ];
  },

  getLegacyPathStorageKeys() {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.origin) {
        const originPath = `${window.location.origin}${window.location.pathname || ''}`;
        return [
          `likable_designs_${originPath}`,
          `likeable_designs_${originPath}`,
          `designify_designs_${originPath}`
        ];
      }
    } catch {}
    return [];
  },

  /**
   * Loads cached designs from storage for the current (or specified) total URL
   */
  async loadDesigns(url) {
    const key = this.getStorageKey(url);
    const legacyKeys = this.getLegacyStorageKeys(url);
    const legacyPathKeys = this.getLegacyPathStorageKeys();
    const queryKeys = [key, ...legacyKeys, ...legacyPathKeys];

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(queryKeys);
        if (Array.isArray(result[key]) && result[key].length > 0) {
          this.cachedList = result[key];
        } else {
          const foundLegacy = legacyKeys.find((k) => Array.isArray(result[k]) && result[k].length > 0);
          if (foundLegacy) {
            this.cachedList = result[foundLegacy];
          } else {
            const foundPath = legacyPathKeys.find((k) => Array.isArray(result[k]) && result[k].length > 0);
            this.cachedList = foundPath ? result[foundPath] : [];
          }
        }
      } else {
        const raw =
          localStorage.getItem(key) ||
          legacyKeys.map((k) => localStorage.getItem(k)).find(Boolean) ||
          legacyPathKeys.map((k) => localStorage.getItem(k)).find(Boolean);
        this.cachedList = raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      console.warn('[Likable Cache] Failed to load from chrome.storage:', e);
      try {
        const raw =
          localStorage.getItem(key) ||
          legacyKeys.map((k) => localStorage.getItem(k)).find(Boolean) ||
          legacyPathKeys.map((k) => localStorage.getItem(k)).find(Boolean);
        this.cachedList = raw ? JSON.parse(raw) : [];
      } catch {}
    }

    if (this.cachedList.length > 0 && !this.currentActiveId) {
      this.currentActiveId = this.cachedList[0].id;
    }

    return this.cachedList;
  },

  /**
   * Saves a newly generated redesign to the cache
   */
  async saveDesign(redesign) {
    const key = this.getStorageKey();
    const totalUrl = this.getTotalUrl();

    const entry = {
      id: redesign.id || `des_${Date.now()}`,
      themeKey: redesign.themeKey || 'custom',
      themeName: redesign.themeName || 'Modern Redesign',
      summary: redesign.summary || '',
      customPrompt: redesign.customPrompt || '',
      engineUsed: redesign.engineUsed || 'claude',
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      url: totalUrl,
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
      console.warn('[Likable Cache] Save error:', e);
    }

    console.log(`[Likable Cache] Saved design "${entry.themeName}" (${entry.id}) for route "${totalUrl}". Total cached: ${this.cachedList.length}`);
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
   * Clears all cached designs for the current total URL
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
window.LikableCache = window.LikeableCache = window.DesignifyCache;
