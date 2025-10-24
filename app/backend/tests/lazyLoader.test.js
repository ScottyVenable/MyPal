import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import LazyLoader, { getLazyLoader } from '../src/lazyLoader.js';

describe('LazyLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new LazyLoader();
  });

  test('registers and loads data', async () => {
    const testData = { value: 'test data' };
    let loadCount = 0;

    loader.register('test', () => {
      loadCount++;
      return testData;
    });

    const result = await loader.load('test');

    assert.deepEqual(result, testData, 'Should return loaded data');
    assert.equal(loadCount, 1, 'Should call loader once');
  });

  test('caches data on first load', async () => {
    const testData = { value: 'cached data' };
    let loadCount = 0;

    loader.register('cached', () => {
      loadCount++;
      return testData;
    });

    // First load
    await loader.load('cached');
    assert.equal(loadCount, 1, 'Should load once');

    // Second load (from cache)
    await loader.load('cached');
    assert.equal(loadCount, 1, 'Should not reload from source');

    assert.equal(loader.isCached('cached'), true, 'Should be cached');
  });

  test('evicts item when TTL expires', async () => {
    const testData = { value: 'ttl test' };
    let loadCount = 0;

    loader.register('ttl', () => {
      loadCount++;
      return testData;
    }, { ttl: 100 }); // 100ms TTL

    await loader.load('ttl');
    assert.equal(loadCount, 1, 'First load');

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    await loader.load('ttl');
    assert.equal(loadCount, 2, 'Should reload after TTL expires');
  });

  test('evicts least recently used items when cache is full', async () => {
    loader.setMaxCacheSize(2000); // Larger cache for testing

    const data1 = { data: 'x'.repeat(400) }; // ~400 bytes
    const data2 = { data: 'y'.repeat(400) }; // ~400 bytes
    const data3 = { data: 'z'.repeat(400) }; // ~400 bytes

    loader.register('item1', () => data1);
    loader.register('item2', () => data2);
    loader.register('item3', () => data3);

    // Load first two items (will fit in cache)
    await loader.load('item1');
    await loader.load('item2');

    assert.equal(loader.isCached('item1'), true, 'Item1 should be cached');
    assert.equal(loader.isCached('item2'), true, 'Item2 should be cached');

    // Access item2 again to make it more recently used
    await loader.load('item2');

    // Load third item (should evict item1 as LRU)
    await loader.load('item3');

    // Item1 should be evicted as least recently used
    assert.equal(loader.isCached('item1'), false, 'Item1 should be evicted');
    assert.equal(loader.isCached('item3'), true, 'Item3 should be cached');
  });

  test('tracks access statistics', async () => {
    loader.register('stats', () => ({ value: 'test' }));

    await loader.load('stats');
    await loader.load('stats');
    await loader.load('stats');

    const stats = loader.getStats();
    const item = stats.items.find(i => i.key === 'stats');

    assert.equal(item.accessed, 3, 'Should track access count');
    assert.equal(item.cached, true, 'Should show cached status');
  });

  test('clears all cached data', async () => {
    loader.register('clear1', () => ({ value: 1 }));
    loader.register('clear2', () => ({ value: 2 }));

    await loader.load('clear1');
    await loader.load('clear2');

    assert.equal(loader.isCached('clear1'), true);
    assert.equal(loader.isCached('clear2'), true);

    loader.clear();

    assert.equal(loader.isCached('clear1'), false);
    assert.equal(loader.isCached('clear2'), false);

    const stats = loader.getStats();
    assert.equal(stats.cachedItems, 0, 'Should clear all cached items');
    assert.equal(stats.cacheSize, 0, 'Should reset cache size');
  });

  test('evicts specific items', async () => {
    loader.register('evict1', () => ({ value: 1 }));
    loader.register('evict2', () => ({ value: 2 }));

    await loader.load('evict1');
    await loader.load('evict2');

    loader.evict('evict1');

    assert.equal(loader.isCached('evict1'), false, 'Should evict specific item');
    assert.equal(loader.isCached('evict2'), true, 'Should keep other items');
  });

  test('loadSync works for synchronous loaders', () => {
    loader.register('sync', () => ({ value: 'sync data' }));

    const result = loader.loadSync('sync');

    assert.deepEqual(result, { value: 'sync data' }, 'Should load synchronously');
    assert.equal(loader.isCached('sync'), true, 'Should cache sync loaded data');
  });

  test('throws error for unregistered key', async () => {
    await assert.rejects(
      async () => await loader.load('unregistered'),
      /No loader registered/,
      'Should throw error for unregistered key'
    );
  });

  test('preloads data into cache', async () => {
    let loadCount = 0;
    loader.register('preload', () => {
      loadCount++;
      return { value: 'preloaded' };
    });

    await loader.preload('preload');

    assert.equal(loadCount, 1, 'Should call loader');
    assert.equal(loader.isCached('preload'), true, 'Should be in cache');

    // Subsequent load should use cache
    await loader.load('preload');
    assert.equal(loadCount, 1, 'Should not reload');
  });

  test('reports cache statistics correctly', async () => {
    loader.setMaxCacheSize(10000);

    loader.register('stats1', () => ({ data: 'test1' }));
    loader.register('stats2', () => ({ data: 'test2' }));

    await loader.load('stats1');

    const stats = loader.getStats();

    assert.equal(stats.registeredItems, 2, 'Should have 2 registered items');
    assert.equal(stats.cachedItems, 1, 'Should have 1 cached item');
    assert.ok(stats.cacheSize > 0, 'Cache size should be > 0');
    assert.equal(stats.maxCacheSize, 10000, 'Should report max cache size');
    assert.ok(parseFloat(stats.utilizationPercent) >= 0, 'Should calculate utilization');
  });

  test('singleton instance works', () => {
    const instance1 = getLazyLoader();
    const instance2 = getLazyLoader();

    assert.equal(instance1, instance2, 'Should return same instance');
  });

  test('handles large data structures', async () => {
    const largeData = {
      regions: Array(100).fill(null).map((_, i) => ({
        id: `region-${i}`,
        neurons: Array(50).fill(null).map((_, j) => ({
          id: `neuron-${i}-${j}`,
          connections: Array(10).fill(null).map((_, k) => ({
            target: `neuron-${(i + 1) % 100}-${k}`,
            weight: Math.random()
          }))
        }))
      }))
    };

    loader.register('large', () => largeData);

    const result = await loader.load('large');

    assert.equal(result.regions.length, 100, 'Should load large data');
    assert.equal(loader.isCached('large'), true, 'Should cache large data');

    const stats = loader.getStats();
    assert.ok(stats.cacheSize > 100000, 'Should track large cache size');
  });
});
