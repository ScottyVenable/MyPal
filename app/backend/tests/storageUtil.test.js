import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import StorageUtil from '../src/storageUtil.js';

describe('StorageUtil', () => {
  let tempDir;
  let testFilePath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'));
    testFilePath = path.join(tempDir, 'test.json');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('writeJson creates minified JSON by default', () => {
    const testData = {
      name: 'test',
      items: [1, 2, 3],
      nested: { key: 'value' }
    };

    const success = StorageUtil.writeJson(testFilePath, testData);
    assert.equal(success, true, 'writeJson should return true');

    const content = fs.readFileSync(testFilePath, 'utf8');
    assert.equal(content.includes('\n'), false, 'Minified JSON should not contain newlines');
    assert.equal(content.includes('  '), false, 'Minified JSON should not contain indentation');
  });

  test('writeJson with pretty option creates formatted JSON', () => {
    const testData = { name: 'test', value: 123 };

    const success = StorageUtil.writeJson(testFilePath, testData, false, true);
    assert.equal(success, true, 'writeJson should return true');

    const content = fs.readFileSync(testFilePath, 'utf8');
    assert.equal(content.includes('\n'), true, 'Pretty JSON should contain newlines');
    assert.equal(content.includes('  '), true, 'Pretty JSON should contain indentation');
  });

  test('readJson reads minified data correctly', () => {
    const testData = { key: 'value', number: 42, array: [1, 2, 3] };

    StorageUtil.writeJson(testFilePath, testData);
    const readData = StorageUtil.readJson(testFilePath);

    assert.deepEqual(readData, testData, 'Read data should match written data');
  });

  test('readJson returns default value for non-existent file', () => {
    const defaultValue = { default: true };
    const result = StorageUtil.readJson('/nonexistent/path.json', defaultValue);

    assert.deepEqual(result, defaultValue, 'Should return default value');
  });

  test('minifyFile reduces file size', () => {
    const testData = {
      largeArray: Array(100).fill({ key: 'value', number: 123 })
    };

    // Write pretty-printed first
    StorageUtil.writeJson(testFilePath, testData, false, true);
    const originalSize = fs.statSync(testFilePath).size;

    // Minify
    const result = StorageUtil.minifyFile(testFilePath);

    assert.equal(result.success, true, 'Minification should succeed');
    assert.equal(result.newSize < originalSize, true, 'Minified size should be smaller');
    assert.equal(result.savings > 0, true, 'Should report savings');
    assert.equal(parseFloat(result.percentSaved) > 0, true, 'Should have positive percent saved');

    // Verify data integrity
    const readData = StorageUtil.readJson(testFilePath);
    assert.deepEqual(readData, testData, 'Data should remain unchanged after minification');
  });

  test('compressFile creates .gz file and removes original', () => {
    const testData = {
      largeData: 'x'.repeat(1000)
    };

    StorageUtil.writeJson(testFilePath, testData);
    const result = StorageUtil.compressFile(testFilePath);

    assert.equal(result.success, true, 'Compression should succeed');
    assert.equal(fs.existsSync(testFilePath), false, 'Original file should be removed');
    assert.equal(fs.existsSync(testFilePath + '.gz'), true, 'Compressed file should exist');
    assert.equal(result.newSize < result.originalSize, true, 'Compressed size should be smaller');
  });

  test('readJson reads compressed data correctly', () => {
    const testData = { compressed: true, data: 'test' };

    StorageUtil.writeJson(testFilePath, testData, true);
    const readData = StorageUtil.readJson(testFilePath + '.gz', null, true);

    assert.deepEqual(readData, testData, 'Read compressed data should match written data');
  });

  test('decompressFile restores original file', () => {
    const testData = { key: 'value' };
    const gzPath = testFilePath + '.gz';

    // Write compressed
    StorageUtil.writeJson(testFilePath, testData, true);
    
    // Decompress
    const result = StorageUtil.decompressFile(testFilePath);

    assert.equal(result.success, true, 'Decompression should succeed');
    assert.equal(fs.existsSync(testFilePath), true, 'Decompressed file should exist');

    const readData = StorageUtil.readJson(testFilePath);
    assert.deepEqual(readData, testData, 'Decompressed data should match original');
  });

  test('getFileSize returns correct information', () => {
    const testData = { test: 'data' };
    StorageUtil.writeJson(testFilePath, testData);

    const size = StorageUtil.getFileSize(testFilePath);

    assert.equal(size.exists, true, 'File should exist');
    assert.equal(typeof size.bytes, 'number', 'Should return bytes');
    assert.equal(typeof size.kb, 'string', 'Should return KB as string');
    assert.equal(typeof size.mb, 'string', 'Should return MB as string');
  });

  test('getFileSize returns exists: false for non-existent file', () => {
    const size = StorageUtil.getFileSize('/nonexistent/file.json');

    assert.equal(size.exists, false, 'Should indicate file does not exist');
  });

  test('shouldCompress returns true for large files', () => {
    const largeData = { data: 'x'.repeat(60 * 1024) }; // ~60KB
    StorageUtil.writeJson(testFilePath, largeData);

    const shouldCompress = StorageUtil.shouldCompress(testFilePath, 50);

    assert.equal(shouldCompress, true, 'Should recommend compression for files > 50KB');
  });

  test('shouldCompress returns false for small files', () => {
    const smallData = { data: 'small' };
    StorageUtil.writeJson(testFilePath, smallData);

    const shouldCompress = StorageUtil.shouldCompress(testFilePath, 50);

    assert.equal(shouldCompress, false, 'Should not recommend compression for small files');
  });

  test('handles large data sets efficiently', () => {
    // Create a large dataset similar to vocabulary or memories
    const largeData = Array(500).fill(null).map((_, i) => ({
      id: `id-${i}`,
      word: `word${i}`,
      count: i,
      contexts: [`context for word ${i}`, `another context ${i}`],
      metadata: { timestamp: Date.now(), level: i % 10 }
    }));

    // Write pretty-printed
    StorageUtil.writeJson(testFilePath, largeData, false, true);
    const prettySize = fs.statSync(testFilePath).size;

    // Write minified
    StorageUtil.writeJson(testFilePath, largeData, false, false);
    const minifiedSize = fs.statSync(testFilePath).size;

    // Calculate savings
    const savings = ((prettySize - minifiedSize) / prettySize * 100).toFixed(2);

    assert.equal(minifiedSize < prettySize, true, 'Minified should be smaller');
    assert.equal(parseFloat(savings) > 20, true, 'Should save at least 20% on large datasets');

    // Verify data integrity
    const readData = StorageUtil.readJson(testFilePath);
    assert.deepEqual(readData, largeData, 'Data integrity should be maintained');
  });
});
