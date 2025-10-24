/**
 * Lazy Loader for large data structures
 * Provides on-demand loading with caching and memory management
 */

class LazyLoader {
  constructor() {
    this.cache = new Map();
    this.metadata = new Map();
    this.maxCacheSize = 10 * 1024 * 1024; // 10MB cache limit
    this.currentCacheSize = 0;
  }

  /**
   * Register a data source for lazy loading
   * @param {string} key - Unique identifier for the data
   * @param {Function} loader - Function that loads and returns the data
   * @param {object} options - Loading options
   */
  register(key, loader, options = {}) {
    this.metadata.set(key, {
      loader,
      accessed: 0,
      lastAccess: 0,
      size: options.estimatedSize || 0,
      ttl: options.ttl || Infinity,
      priority: options.priority || 0
    });
  }

  /**
   * Load data (from cache or source)
   * @param {string} key - Data identifier
   * @returns {Promise<*>} Loaded data
   */
  async load(key) {
    const meta = this.metadata.get(key);
    if (!meta) {
      throw new Error(`No loader registered for key: ${key}`);
    }

    // Check cache first
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      
      // Check TTL
      if (Date.now() - cached.timestamp < meta.ttl) {
        meta.accessed++;
        meta.lastAccess = Date.now();
        return cached.data;
      }
      
      // TTL expired, remove from cache
      this.evict(key);
    }

    // Load from source
    const data = await meta.loader();
    const size = this.estimateSize(data);

    // Update metadata
    meta.accessed++;
    meta.lastAccess = Date.now();
    meta.size = size;

    // Add to cache if space available
    if (this.currentCacheSize + size <= this.maxCacheSize) {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        size
      });
      this.currentCacheSize += size;
    } else {
      // Evict least recently used items to make space
      this.evictLRU(size);
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        size
      });
      this.currentCacheSize += size;
    }

    return data;
  }

  /**
   * Load data synchronously (use with caution)
   * @param {string} key - Data identifier
   * @returns {*} Loaded data
   */
  loadSync(key) {
    const meta = this.metadata.get(key);
    if (!meta) {
      throw new Error(`No loader registered for key: ${key}`);
    }

    // Check cache
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < meta.ttl) {
        meta.accessed++;
        meta.lastAccess = Date.now();
        return cached.data;
      }
      this.evict(key);
    }

    // Load from source (must be synchronous loader)
    const data = meta.loader();
    const size = this.estimateSize(data);

    meta.accessed++;
    meta.lastAccess = Date.now();
    meta.size = size;

    // Cache management
    if (this.currentCacheSize + size <= this.maxCacheSize) {
      this.cache.set(key, { data, timestamp: Date.now(), size });
      this.currentCacheSize += size;
    } else {
      this.evictLRU(size);
      this.cache.set(key, { data, timestamp: Date.now(), size });
      this.currentCacheSize += size;
    }

    return data;
  }

  /**
   * Preload data into cache
   * @param {string} key - Data identifier
   */
  async preload(key) {
    return await this.load(key);
  }

  /**
   * Check if data is cached
   * @param {string} key - Data identifier
   * @returns {boolean}
   */
  isCached(key) {
    return this.cache.has(key);
  }

  /**
   * Evict specific item from cache
   * @param {string} key - Data identifier
   */
  evict(key) {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      this.currentCacheSize -= cached.size;
      this.cache.delete(key);
    }
  }

  /**
   * Evict least recently used items to make space
   * @param {number} spaceNeeded - Bytes needed
   */
  evictLRU(spaceNeeded) {
    // Sort by last access time (oldest first)
    const entries = Array.from(this.metadata.entries())
      .filter(([key]) => this.cache.has(key))
      .sort(([, a], [, b]) => a.lastAccess - b.lastAccess);

    let freedSpace = 0;
    for (const [key] of entries) {
      if (freedSpace >= spaceNeeded) break;
      
      const cached = this.cache.get(key);
      if (cached) {
        freedSpace += cached.size;
        this.evict(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    return {
      cachedItems: this.cache.size,
      registeredItems: this.metadata.size,
      cacheSize: this.currentCacheSize,
      maxCacheSize: this.maxCacheSize,
      utilizationPercent: ((this.currentCacheSize / this.maxCacheSize) * 100).toFixed(2),
      items: Array.from(this.metadata.entries()).map(([key, meta]) => ({
        key,
        cached: this.cache.has(key),
        accessed: meta.accessed,
        lastAccess: meta.lastAccess,
        size: meta.size,
        priority: meta.priority
      }))
    };
  }

  /**
   * Estimate size of data in bytes
   * @param {*} data - Data to estimate
   * @returns {number} Estimated size
   */
  estimateSize(data) {
    if (data === null || data === undefined) return 0;
    
    const json = JSON.stringify(data);
    return json.length * 2; // Unicode characters can be 2 bytes
  }

  /**
   * Set maximum cache size
   * @param {number} bytes - Max cache size in bytes
   */
  setMaxCacheSize(bytes) {
    this.maxCacheSize = bytes;
    
    // Evict items if over limit
    if (this.currentCacheSize > this.maxCacheSize) {
      const excess = this.currentCacheSize - this.maxCacheSize;
      this.evictLRU(excess);
    }
  }
}

// Singleton instance
let instance = null;

/**
 * Get the global lazy loader instance
 * @returns {LazyLoader}
 */
export function getLazyLoader() {
  if (!instance) {
    instance = new LazyLoader();
  }
  return instance;
}

export default LazyLoader;
