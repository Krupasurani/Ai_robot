import { Logger } from '../services/logger.service';

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  heapUsedMB: string;
  heapTotalMB: string;
  rssMB: string;
  externalMB: string;
}

export class MemoryMonitor {
  private static logger = Logger.getInstance();
  private static snapshots: Map<string, MemoryUsage> = new Map();
  private static intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get current memory usage
   */
  static getMemoryUsage(): MemoryUsage {
    const used = process.memoryUsage();
    return {
      heapUsed: used.heapUsed,
      heapTotal: used.heapTotal,
      rss: used.rss,
      external: used.external,
      heapUsedMB: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
      heapTotalMB: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
      rssMB: `${Math.round(used.rss / 1024 / 1024)} MB`,
      externalMB: `${Math.round(used.external / 1024 / 1024)} MB`,
    };
  }

  /**
   * Log memory usage with a label
   */
  static logMemoryUsage(label: string): MemoryUsage {
    const usage = this.getMemoryUsage();
    this.logger.info(`Memory Usage - ${label}:`, {
      heapUsed: usage.heapUsedMB,
      heapTotal: usage.heapTotalMB,
      rss: usage.rssMB,
      external: usage.externalMB,
    });
    return usage;
  }

  /**
   * Take a memory snapshot
   */
  static takeSnapshot(label: string): MemoryUsage {
    const usage = this.getMemoryUsage();
    this.snapshots.set(label, usage);
    this.logger.info(`Memory Snapshot - ${label}:`, {
      heapUsed: usage.heapUsedMB,
      heapTotal: usage.heapTotalMB,
      rss: usage.rssMB,
      external: usage.externalMB,
    });
    return usage;
  }

  /**
   * Compare current memory with a snapshot
   */
  static compareWithSnapshot(label: string): void {
    const snapshot = this.snapshots.get(label);
    if (!snapshot) {
      this.logger.warn(`No snapshot found for label: ${label}`);
      return;
    }

    const current = this.getMemoryUsage();
    const heapUsedDiff = current.heapUsed - snapshot.heapUsed;
    const heapUsedDiffMB = Math.round(heapUsedDiff / 1024 / 1024);

    this.logger.info(`Memory Comparison - ${label}:`, {
      current: {
        heapUsed: current.heapUsedMB,
        heapTotal: current.heapTotalMB,
        rss: current.rssMB,
      },
      snapshot: {
        heapUsed: snapshot.heapUsedMB,
        heapTotal: snapshot.heapTotalMB,
        rss: snapshot.rssMB,
      },
      difference: {
        heapUsed: `${heapUsedDiffMB > 0 ? '+' : ''}${heapUsedDiffMB} MB`,
      },
    });

    // Warn if significant memory increase
    if (heapUsedDiffMB > 50) {
      this.logger.warn(`Significant memory increase detected: +${heapUsedDiffMB} MB since ${label}`);
    }
  }

  /**
   * Start periodic memory monitoring
   */
  static startMonitoring(label: string, intervalMs: number = 60000): void {
    if (this.intervals.has(label)) {
      this.logger.warn(`Monitoring already running for label: ${label}`);
      return;
    }

    const interval = setInterval(() => {
      this.logMemoryUsage(`${label} - Periodic`);
    }, intervalMs);

    this.intervals.set(label, interval);
    this.logger.info(`Started memory monitoring for: ${label} (${intervalMs}ms interval)`);
  }

  /**
   * Stop periodic memory monitoring
   */
  static stopMonitoring(label: string): void {
    const interval = this.intervals.get(label);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(label);
      this.logger.info(`Stopped memory monitoring for: ${label}`);
    }
  }

  /**
   * Stop all monitoring and clear snapshots
   */
  static cleanup(): void {
    // Stop all intervals
    for (const [_label, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();

    // Clear snapshots
    this.snapshots.clear();

    this.logger.info('Memory monitor cleanup completed');
  }

  /**
   * Force garbage collection if available
   */
  static forceGC(): void {
    if (global.gc) {
      global.gc();
      this.logger.info('Forced garbage collection');
    } else {
      this.logger.warn('Garbage collection not available. Start with --expose-gc flag');
    }
  }

  /**
   * Check for potential memory leaks
   */
  static checkForLeaks(): void {
    const usage = this.getMemoryUsage();
    
    // Check for high memory usage
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);
    
    if (heapUsedMB > 500) {
      this.logger.warn(`High heap usage detected: ${usage.heapUsedMB} MB`);
    }
    
    if (rssMB > 1000) {
      this.logger.warn(`High RSS usage detected: ${usage.rssMB} MB`);
    }
    
    // Check for memory fragmentation
    const fragmentation = ((usage.heapTotal - usage.heapUsed) / usage.heapTotal) * 100;
    if (fragmentation > 50) {
      this.logger.warn(`High memory fragmentation detected: ${fragmentation.toFixed(1)}%`);
    }
  }
} 