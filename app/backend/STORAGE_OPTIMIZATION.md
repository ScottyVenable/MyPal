# Storage Optimization System

## Overview

The MyPal storage optimization system provides efficient data storage and retrieval for chat logs, memories, vocabulary, and neural networks. It achieves significant space savings through multiple optimization techniques while maintaining full backward compatibility.

## Features

### 1. Minified JSON Storage
- All JSON files are now stored in minified format (no whitespace, no indentation)
- Reduces file sizes by 25-35% compared to pretty-printed JSON
- Backward compatible: can read both minified and pretty-printed files

### 2. Compression for Large Files
- Neural network data (typically 280KB+) is automatically compressed using gzip
- Achieves 90%+ compression ratio for neural.json files
- Automatic detection and decompression on read
- Files over 50KB threshold are automatically compressed

### 3. Data Structure Optimization
- **Vocabulary contexts**: Deduplicated and stored as references
- **Memories**: Reference chat log entries instead of duplicating text
- **Tags**: Removes duplicate tag arrays in importance objects

## Performance Impact

### Storage Savings
Real-world measurements from sample profile:

| File | Original | Optimized | Savings |
|------|----------|-----------|---------|
| neural.json | 280KB | 25KB | 91.25% |
| vocabulary.json | 1.3KB | 863 bytes | 34.32% |
| memories.json | 850 bytes | 562 bytes | 33.88% |
| chat-log.json | 267 bytes | 200 bytes | 25.09% |
| **Total Profile** | **283.34KB** | **27.1KB** | **90.44%** |

### Access Performance
- Read operations: No performance impact (transparent decompression)
- Write operations: Minimal overhead from minification (~1-2ms)
- Compression: Applied only to large files (neural.json)

## Usage

### StorageUtil API

```javascript
import StorageUtil from './storageUtil.js';

// Read JSON (automatically handles compressed files)
const data = StorageUtil.readJson(filePath, defaultValue);

// Read compressed file
const compressed = StorageUtil.readJson(filePath + '.gz', null, true);

// Write JSON (minified by default)
StorageUtil.writeJson(filePath, data);

// Write with compression
StorageUtil.writeJson(filePath, data, true);

// Write pretty-printed (for debugging)
StorageUtil.writeJson(filePath, data, false, true);

// Migrate existing file to minified
const result = StorageUtil.minifyFile(filePath);
console.log(`Saved ${result.percentSaved}%`);

// Compress large file
const result = StorageUtil.compressFile(filePath);
console.log(`Compressed to ${result.newSize} bytes`);

// Get file size info
const size = StorageUtil.getFileSize(filePath);
console.log(`Size: ${size.kb} KB`);

// Check if file should be compressed
if (StorageUtil.shouldCompress(filePath, 50)) {
  StorageUtil.compressFile(filePath);
}
```

### DataOptimizer API

```javascript
import DataOptimizer from './dataOptimizer.js';

// Optimize vocabulary (deduplicate contexts)
const { vocabulary, contexts } = DataOptimizer.optimizeVocabulary(vocabArray);

// Restore vocabulary with full contexts
const restored = DataOptimizer.restoreVocabulary(vocabulary, contexts);

// Optimize memories (use chat references)
const optimizedMemories = DataOptimizer.optimizeMemories(memories, chatLog);

// Restore memories with full text
const restoredMemories = DataOptimizer.restoreMemories(optimizedMemories, chatLog);

// Optimize entire profile
const optimizations = DataOptimizer.optimizeProfile({
  vocabulary,
  memories,
  chatLog
});

// Restore entire profile
const restored = DataOptimizer.restoreProfile(optimizations);

// Calculate savings
const savings = DataOptimizer.calculateSavings(original, optimized);
console.log(`Saved ${savings.percent}%`);
```

### LazyLoader API

```javascript
import LazyLoader, { getLazyLoader } from './lazyLoader.js';

// Create a new loader or use singleton
const loader = getLazyLoader();

// Register data sources for lazy loading
loader.register('neuralNetwork', () => {
  // Load neural network from file
  return StorageUtil.readJson('neural.json.gz', null, true);
}, {
  estimatedSize: 25 * 1024, // 25KB
  ttl: 60000, // 60 second cache
  priority: 1
});

// Load data (from cache or source)
const network = await loader.load('neuralNetwork');

// Load synchronously if needed
const networkSync = loader.loadSync('neuralNetwork');

// Preload data into cache
await loader.preload('neuralNetwork');

// Check if cached
if (loader.isCached('neuralNetwork')) {
  console.log('Data is in cache');
}

// Get cache statistics
const stats = loader.getStats();
console.log(`Cache: ${stats.cachedItems} items, ${stats.cacheSize} bytes`);

// Evict specific item
loader.evict('neuralNetwork');

// Clear all cache
loader.clear();

// Set cache size limit
loader.setMaxCacheSize(10 * 1024 * 1024); // 10MB
```

## Migration

### Migrating Existing Data

Run the migration script to optimize existing profile data:

```bash
cd app/backend
node scripts/migrate-storage.js
```

The migration script will:
1. Convert all pretty-printed JSON files to minified format
2. Compress neural.json files (>50KB)
3. Report detailed savings statistics
4. Preserve data integrity (non-destructive)

### Manual Migration

```javascript
import StorageUtil from './src/storageUtil.js';

// Minify a single file
const result = StorageUtil.minifyFile('data/profile/chat-log.json');
console.log(`Saved ${result.percentSaved}%`);

// Compress neural network data
const result = StorageUtil.compressFile('data/profile/neural.json');
console.log(`Compressed to ${result.newSize} bytes`);
```

## Integration

### ProfileManager
ProfileManager automatically uses StorageUtil for all file operations:
- Reads both minified and compressed files transparently
- Writes minified JSON by default
- Auto-compresses neural.json when it exceeds 50KB threshold

### Server
Server's `readJson()` and `writeJson()` functions now use StorageUtil internally:
- No changes needed to existing code
- Automatic optimization on all reads/writes
- Backward compatible with existing data files

## File Format Compatibility

### Backward Compatibility
- Can read both pretty-printed and minified JSON
- Can read both compressed (.gz) and uncompressed files
- Automatic format detection
- No migration required (but recommended for space savings)

### Forward Compatibility
- Minified JSON is standard JSON format
- Compressed files use standard gzip format
- Any JSON parser can read the files (after decompression if needed)

## Best Practices

### When to Use Compression
- Files larger than 50KB (automatic threshold)
- Neural network data (always compress)
- Archive/backup data
- Long-term storage

### When to Use Pretty-Printing
- Development/debugging only
- Temporary inspection files
- Configuration files edited manually

### Optimization Strategy
1. Always use minified JSON for storage (default)
2. Compress files >50KB automatically
3. Keep chat logs uncompressed (frequent access, small size)
4. Deduplicate contexts in vocabulary
5. Use chat references in memories

## Testing

Run the test suite:

```bash
cd app/backend
npm test tests/storageUtil.test.js      # Storage utility tests (13 tests)
npm test tests/dataOptimizer.test.js    # Data optimizer tests (8 tests)
npm test tests/lazyLoader.test.js       # Lazy loader tests (13 tests)
npm test tests/chat.test.js             # Chat functionality tests (2 tests)
npm test                                 # All tests (36 tests)
```

Test coverage:
- ✅ Minified JSON read/write (13 tests)
- ✅ Compression/decompression
- ✅ File size calculations
- ✅ Migration operations
- ✅ Vocabulary deduplication (8 tests)
- ✅ Memory optimization
- ✅ Profile optimization
- ✅ Data restoration
- ✅ Lazy loading and caching (13 tests)
- ✅ LRU eviction
- ✅ TTL expiration
- ✅ Cache management
- ✅ Backward compatibility
- ✅ Chat endpoint integration (2 tests)

## Troubleshooting

### Large Memory Usage
If memory usage is high:
1. Check if neural.json is compressed (should be .gz file)
2. Run migration script to compress uncompressed files
3. Consider lowering compression threshold for more aggressive compression

### Slow Read Performance
If reads are slow:
1. Check if large files are being read repeatedly
2. Consider lazy loading for neural network data
3. Use pagination for chat log retrieval

### Data Corruption
If data appears corrupted:
1. Check file format (should be valid JSON or gzip)
2. Verify StorageUtil version matches file format
3. Restore from backup if needed
4. Re-run migration script

## Future Enhancements

Phase 3 features implemented:
- ✅ Lazy loading for neural network regions
- ✅ LRU cache with configurable size limits
- ✅ Automatic cache eviction and memory management

Additional planned optimizations:
- [ ] Pagination for chat log retrieval  
- [ ] Indexed access for memory lookups
- [ ] Incremental compression updates
- [ ] Background optimization jobs
- [ ] Automatic pruning of old data

## Technical Details

### Compression Algorithm
- Uses Node.js zlib (gzip) with default compression level
- Compression ratio: 85-95% for neural network data
- Compression time: <100ms for typical neural.json file
- Decompression time: <50ms for typical file

### File Format
Minified JSON:
```json
{"id":"123","data":"value","nested":{"key":"value"}}
```

Compressed file structure:
- Extension: `.json.gz`
- Format: gzip compressed JSON
- Readable by: zlib, gunzip, standard gzip tools

### Memory Footprint
- Minified JSON: No memory overhead
- Compressed files: Temporary decompression buffer (~2x file size)
- Automatic cleanup after read/write operations

## License

Part of the MyPal project. See main LICENSE file.

## Contributing

When contributing to storage optimization:
1. Add tests for new optimization techniques
2. Ensure backward compatibility
3. Document performance impact
4. Update migration scripts as needed
5. Run full test suite before committing
