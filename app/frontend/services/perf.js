/**
 * MyPal Performance Instrumentation Module
 * 
 * Lightweight performance monitoring with localStorage toggle.
 * Enable with: localStorage.setItem('mypal_debug_perf', 'true')
 * 
 * Usage:
 *   perf.mark('operation_start');
 *   // ... do work
 *   perf.mark('operation_end');
 *   perf.measure('Operation Time', 'operation_start', 'operation_end');
 *   perf.report(); // Print all metrics
 */

class PerfMonitor {
  constructor() {
    this.enabled = false;
    this.marks = new Map();
    this.measures = [];
    this.longTasks = [];
    this.observer = null;
    
    // Check if performance monitoring is enabled
    this.checkEnabled();
    
    // Set up long task observer if enabled
    if (this.enabled) {
      this.setupLongTaskObserver();
    }
  }
  
  checkEnabled() {
    try {
      this.enabled = localStorage.getItem('mypal_debug_perf') === 'true';
    } catch (e) {
      this.enabled = false;
    }
  }
  
  /**
   * Mark a point in time
   * @param {string} name - Mark identifier
   */
  mark(name) {
    if (!this.enabled) return;
    
    const timestamp = performance.now();
    this.marks.set(name, timestamp);
    
    // Also use native performance API if available
    if (typeof performance.mark === 'function') {
      try {
        performance.mark(name);
      } catch (e) {
        // Ignore if mark already exists
      }
    }
    
    console.log(`[PERF] Mark: ${name} @ ${timestamp.toFixed(2)}ms`);
  }
  
  /**
   * Measure time between two marks
   * @param {string} label - Measurement label
   * @param {string} startMark - Start mark name
   * @param {string} endMark - End mark name (optional, defaults to now)
   */
  measure(label, startMark, endMark = null) {
    if (!this.enabled) return;
    
    const start = this.marks.get(startMark);
    if (start === undefined) {
      console.warn(`[PERF] Start mark "${startMark}" not found`);
      return;
    }
    
    const end = endMark ? this.marks.get(endMark) : performance.now();
    if (end === undefined) {
      console.warn(`[PERF] End mark "${endMark}" not found`);
      return;
    }
    
    const duration = end - start;
    this.measures.push({ label, startMark, endMark, duration });
    
    // Use native performance API
    if (typeof performance.measure === 'function') {
      try {
        if (endMark) {
          performance.measure(label, startMark, endMark);
        } else {
          performance.measure(label, startMark);
        }
      } catch (e) {
        // Ignore measurement errors
      }
    }
    
    console.log(`[PERF] Measure: ${label} = ${duration.toFixed(2)}ms`);
    return duration;
  }
  
  /**
   * Set up observer for long tasks (>50ms)
   * @param {number} threshold - Threshold in ms (default 50)
   */
  setupLongTaskObserver(threshold = 50) {
    if (!this.enabled) return;
    
    // PerformanceObserver for long tasks
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > threshold) {
              this.longTasks.push({
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime
              });
              console.warn(`[PERF] Long Task: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
            }
          }
        });
        
        // Observe various entry types
        this.observer.observe({ 
          entryTypes: ['measure', 'navigation', 'resource'] 
        });
      } catch (e) {
        console.warn('[PERF] Could not set up PerformanceObserver:', e.message);
      }
    }
  }
  
  /**
   * Get all marks
   */
  getMarks() {
    return Array.from(this.marks.entries()).map(([name, time]) => ({ name, time }));
  }
  
  /**
   * Get all measures
   */
  getMeasures() {
    return [...this.measures];
  }
  
  /**
   * Get all long tasks
   */
  getLongTasks() {
    return [...this.longTasks];
  }
  
  /**
   * Clear all performance data
   */
  clear() {
    this.marks.clear();
    this.measures = [];
    this.longTasks = [];
    
    if (typeof performance.clearMarks === 'function') {
      performance.clearMarks();
    }
    if (typeof performance.clearMeasures === 'function') {
      performance.clearMeasures();
    }
  }
  
  /**
   * Generate and print comprehensive performance report
   */
  report() {
    if (!this.enabled) {
      console.log('[PERF] Performance monitoring is disabled. Enable with localStorage.setItem("mypal_debug_perf", "true")');
      return;
    }
    
    console.group('[PERF] Performance Report');
    
    // Marks
    console.group('Marks');
    const marks = this.getMarks();
    if (marks.length > 0) {
      console.table(marks);
    } else {
      console.log('No marks recorded');
    }
    console.groupEnd();
    
    // Measures
    console.group('Measures');
    const measures = this.getMeasures();
    if (measures.length > 0) {
      // Calculate stats
      const durations = measures.map(m => m.duration);
      const total = durations.reduce((a, b) => a + b, 0);
      const avg = total / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      
      console.table(measures);
      console.log(`Total: ${total.toFixed(2)}ms | Avg: ${avg.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms`);
    } else {
      console.log('No measures recorded');
    }
    console.groupEnd();
    
    // Long Tasks
    console.group('Long Tasks (>50ms)');
    const longTasks = this.getLongTasks();
    if (longTasks.length > 0) {
      console.table(longTasks);
      console.warn(`Found ${longTasks.length} long tasks that may cause jank`);
    } else {
      console.log('No long tasks detected ✓');
    }
    console.groupEnd();
    
    // Memory (if available)
    if (performance.memory) {
      console.group('Memory');
      const mem = performance.memory;
      console.log(`Used: ${(mem.usedJSHeapSize / 1048576).toFixed(2)} MB`);
      console.log(`Total: ${(mem.totalJSHeapSize / 1048576).toFixed(2)} MB`);
      console.log(`Limit: ${(mem.jsHeapSizeLimit / 1048576).toFixed(2)} MB`);
      console.groupEnd();
    }
    
    console.groupEnd();
  }
  
  /**
   * Get summary statistics
   */
  getSummary() {
    const measures = this.getMeasures();
    const longTasks = this.getLongTasks();
    
    return {
      enabled: this.enabled,
      marksCount: this.marks.size,
      measuresCount: measures.length,
      longTasksCount: longTasks.length,
      totalTime: measures.reduce((sum, m) => sum + m.duration, 0),
      memory: performance.memory ? {
        used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
        total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2)
      } : null
    };
  }
}

// Create singleton instance
const perf = new PerfMonitor();

// Export for use in app
window.perf = perf;

// Also export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = perf;
}
