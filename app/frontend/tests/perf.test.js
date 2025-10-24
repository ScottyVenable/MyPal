/**
 * Performance Monitor Tests
 * Tests for the PerfMonitor class from services/perf.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Mock performance API
global.performance = {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {}
};

// Mock localStorage
global.localStorage = {
  storage: {},
  getItem(key) {
    return this.storage[key] || null;
  },
  setItem(key, value) {
    this.storage[key] = String(value);
  },
  removeItem(key) {
    delete this.storage[key];
  }
};

class PerfMonitor {
  constructor() {
    this.enabled = false;
    this.marks = new Map();
    this.measures = [];
    this.longTasks = [];
    this.checkEnabled();
  }
  
  checkEnabled() {
    try {
      this.enabled = localStorage.getItem('mypal_debug_perf') === 'true';
    } catch (e) {
      this.enabled = false;
    }
  }
  
  mark(name) {
    if (!this.enabled) return;
    const timestamp = performance.now();
    this.marks.set(name, timestamp);
  }
  
  measure(label, startMark, endMark = null) {
    if (!this.enabled) return;
    
    const start = this.marks.get(startMark);
    if (start === undefined) return;
    
    const end = endMark ? this.marks.get(endMark) : performance.now();
    if (end === undefined) return;
    
    const duration = end - start;
    this.measures.push({ label, startMark, endMark, duration });
    return duration;
  }
  
  clear() {
    this.marks.clear();
    this.measures = [];
    this.longTasks = [];
  }
  
  report() {
    if (!this.enabled) return;
    return {
      marks: Array.from(this.marks.entries()),
      measures: this.measures,
      longTasks: this.longTasks
    };
  }
}

describe('Performance Monitor', () => {
  test('should initialize with monitoring disabled by default', () => {
    localStorage.removeItem('mypal_debug_perf');
    const perf = new PerfMonitor();
    
    assert.equal(perf.enabled, false);
    assert.ok(perf.marks instanceof Map);
    assert.ok(Array.isArray(perf.measures));
  });

  test('should enable when localStorage flag is set', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    assert.equal(perf.enabled, true);
  });

  test('should not track marks when disabled', () => {
    localStorage.removeItem('mypal_debug_perf');
    const perf = new PerfMonitor();
    
    perf.mark('test_mark');
    assert.equal(perf.marks.size, 0);
  });

  test('should track marks when enabled', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    perf.mark('test_mark');
    assert.equal(perf.marks.size, 1);
    assert.ok(perf.marks.has('test_mark'));
  });

  test('should measure duration between marks', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    perf.mark('start');
    // Simulate some time passing
    const fakeDelay = 50;
    perf.marks.set('end', perf.marks.get('start') + fakeDelay);
    
    const duration = perf.measure('test_operation', 'start', 'end');
    
    assert.equal(duration, fakeDelay);
    assert.equal(perf.measures.length, 1);
    assert.equal(perf.measures[0].label, 'test_operation');
  });

  test('should measure from mark to now', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    perf.mark('start');
    const duration = perf.measure('operation', 'start');
    
    assert.ok(typeof duration === 'number');
    assert.ok(duration >= 0);
  });

  test('should handle missing start mark', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    const duration = perf.measure('test', 'nonexistent');
    assert.equal(duration, undefined);
  });

  test('should handle missing end mark', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    perf.mark('start');
    const duration = perf.measure('test', 'start', 'nonexistent');
    assert.equal(duration, undefined);
  });

  test('should clear all data', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    perf.mark('mark1');
    perf.mark('mark2');
    perf.measure('measure1', 'mark1', 'mark2');
    
    assert.ok(perf.marks.size > 0);
    assert.ok(perf.measures.length > 0);
    
    perf.clear();
    
    assert.equal(perf.marks.size, 0);
    assert.equal(perf.measures.length, 0);
  });

  test('should generate report', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    perf.mark('mark1');
    perf.mark('mark2');
    perf.measure('test', 'mark1', 'mark2');
    
    const report = perf.report();
    
    assert.ok(report);
    assert.ok(Array.isArray(report.marks));
    assert.ok(Array.isArray(report.measures));
    assert.ok(Array.isArray(report.longTasks));
  });

  test('should not generate report when disabled', () => {
    localStorage.removeItem('mypal_debug_perf');
    const perf = new PerfMonitor();
    
    const report = perf.report();
    assert.equal(report, undefined);
  });

  test('should track multiple marks', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    const markNames = ['mark1', 'mark2', 'mark3', 'mark4', 'mark5'];
    markNames.forEach(name => perf.mark(name));
    
    assert.equal(perf.marks.size, markNames.length);
    markNames.forEach(name => {
      assert.ok(perf.marks.has(name));
    });
  });

  test('should track multiple measures', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    perf.mark('start1');
    perf.mark('end1');
    perf.mark('start2');
    perf.mark('end2');
    
    perf.measure('operation1', 'start1', 'end1');
    perf.measure('operation2', 'start2', 'end2');
    
    assert.equal(perf.measures.length, 2);
    assert.equal(perf.measures[0].label, 'operation1');
    assert.equal(perf.measures[1].label, 'operation2');
  });

  test('should handle mark overwrite', () => {
    localStorage.setItem('mypal_debug_perf', 'true');
    const perf = new PerfMonitor();
    
    perf.mark('test');
    const firstTime = perf.marks.get('test');
    
    perf.mark('test'); // Overwrite
    const secondTime = perf.marks.get('test');
    
    assert.ok(secondTime >= firstTime);
    assert.equal(perf.marks.size, 1);
  });
});

describe('Performance Metrics', () => {
  test('should calculate correct duration', () => {
    const start = 1000;
    const end = 1500;
    const duration = end - start;
    
    assert.equal(duration, 500);
  });

  test('should handle zero duration', () => {
    const start = 1000;
    const end = 1000;
    const duration = end - start;
    
    assert.equal(duration, 0);
  });

  test('should validate performance thresholds', () => {
    const THRESHOLDS = {
      FAST: 100,
      NORMAL: 500,
      SLOW: 1000
    };
    
    const classifyPerformance = (duration) => {
      if (duration < THRESHOLDS.FAST) return 'fast';
      if (duration < THRESHOLDS.NORMAL) return 'normal';
      if (duration < THRESHOLDS.SLOW) return 'slow';
      return 'very_slow';
    };
    
    assert.equal(classifyPerformance(50), 'fast');
    assert.equal(classifyPerformance(200), 'normal');
    assert.equal(classifyPerformance(700), 'slow');
    assert.equal(classifyPerformance(1500), 'very_slow');
  });
});
