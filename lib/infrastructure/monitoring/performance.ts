/**
 * Performance Monitoring Utilities
 * Track and measure performance metrics
 */

import { logPerformance } from './logger';

/**
 * Performance timer for measuring operation duration
 */
export class PerformanceTimer {
  private marks: Map<string, number> = new Map();

  start(label: string): void {
    this.marks.set(label, Date.now());
  }

  end(label: string): number {
    const start = this.marks.get(label);
    if (!start) {
      throw new Error(`No start mark found for label: ${label}`);
    }

    const duration = Date.now() - start;
    this.marks.delete(label);
    return duration;
  }

  async measure<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    this.start(label);
    try {
      const result = await fn();
      const duration = this.end(label);
      return { result, duration };
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logPerformance(operation, duration, metadata);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logPerformance(operation, duration, { ...metadata, error: true });
    throw error;
  }
}

/**
 * Measure sync function execution time
 */
export function measureSync<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  const start = Date.now();
  try {
    const result = fn();
    const duration = Date.now() - start;
    logPerformance(operation, duration, metadata);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logPerformance(operation, duration, { ...metadata, error: true });
    throw error;
  }
}

/**
 * Performance decorator for class methods
 */
export function measurePerformance(operation?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return measureAsync(operationName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
