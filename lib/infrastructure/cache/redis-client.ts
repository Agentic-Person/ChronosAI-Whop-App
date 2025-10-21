/**
 * Cache Service using Vercel KV (Redis)
 * Provides type-safe caching with TTL management and pattern-based invalidation
 */

import { kv } from '@vercel/kv';

/**
 * Type-safe cache wrapper with TTL and pattern support
 */
export class CacheService {
  /**
   * Get cached value with automatic deserialization
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await kv.get<T>(key);
      return value;
    } catch (error) {
      console.error('[Cache] Get error:', error);
      return null;
    }
  }

  /**
   * Set cached value with TTL (seconds)
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      if (ttl > 0) {
        await kv.setex(key, ttl, value);
      } else {
        // No expiration
        await kv.set(key, value);
      }
    } catch (error) {
      console.error('[Cache] Set error:', error);
      // Don't throw - cache failures shouldn't break the app
    }
  }

  /**
   * Delete cached value
   * @param key - Cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      await kv.del(key);
    } catch (error) {
      console.error('[Cache] Delete error:', error);
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param pattern - Pattern to match (e.g., "user:*")
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      // Scan for keys matching pattern
      const keys: string[] = [];
      let cursor = 0;

      do {
        const result = await kv.scan(cursor, { match: pattern, count: 100 });
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== 0);

      if (keys.length === 0) {
        return 0;
      }

      // Delete all matching keys
      await kv.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('[Cache] Delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   * @param key - Cache key
   * @returns True if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await kv.exists(key);
      return result === 1;
    } catch (error) {
      console.error('[Cache] Exists error:', error);
      return false;
    }
  }

  /**
   * Get or compute (cache-aside pattern)
   * Tries cache first, computes and caches on miss
   * @param key - Cache key
   * @param computeFn - Function to compute value on cache miss
   * @param ttl - Time to live in seconds
   * @returns Cached or computed value
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - compute value
    const value = await computeFn();

    // Store in cache (fire and forget to not slow down response)
    this.set(key, value, ttl).catch((err) => {
      console.error('[Cache] Background set failed:', err);
    });

    return value;
  }

  /**
   * Get or compute with lock to prevent cache stampede
   * Only one caller computes the value, others wait
   * @param key - Cache key
   * @param computeFn - Function to compute value
   * @param ttl - Time to live in seconds
   * @param lockTtl - Lock TTL in seconds (default: 10)
   * @returns Cached or computed value
   */
  async getOrComputeWithLock<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl: number,
    lockTtl = 10
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const lockKey = `lock:${key}`;

    try {
      // Try to acquire lock
      const lockAcquired = await kv.set(lockKey, '1', { nx: true, ex: lockTtl });

      if (lockAcquired) {
        // We got the lock - compute value
        try {
          const value = await computeFn();
          await this.set(key, value, ttl);
          return value;
        } finally {
          // Release lock
          await kv.del(lockKey);
        }
      } else {
        // Someone else is computing - wait and retry
        await this.sleep(100);

        // Try cache again (should be populated by now)
        const retryCache = await this.get<T>(key);
        if (retryCache !== null) {
          return retryCache;
        }

        // Still not ready - compute ourselves as fallback
        return await computeFn();
      }
    } catch (error) {
      console.error('[Cache] Lock error:', error);
      // Fallback to direct computation
      return await computeFn();
    }
  }

  /**
   * Increment counter (for rate limiting)
   * @param key - Counter key
   * @param ttl - Time to live in seconds
   * @returns New counter value
   */
  async increment(key: string, ttl: number): Promise<number> {
    try {
      const pipeline = kv.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttl);
      const results = await pipeline.exec();
      return (results[0] as number) || 1;
    } catch (error) {
      console.error('[Cache] Increment error:', error);
      return 1;
    }
  }

  /**
   * Decrement counter
   * @param key - Counter key
   * @returns New counter value
   */
  async decrement(key: string): Promise<number> {
    try {
      return await kv.decr(key);
    } catch (error) {
      console.error('[Cache] Decrement error:', error);
      return 0;
    }
  }

  /**
   * Get remaining TTL for a key
   * @param key - Cache key
   * @returns Remaining seconds or -1 if no expiry, -2 if doesn't exist
   */
  async ttl(key: string): Promise<number> {
    try {
      return await kv.ttl(key);
    } catch (error) {
      console.error('[Cache] TTL error:', error);
      return -2;
    }
  }

  /**
   * Add item to list (left push)
   * @param key - List key
   * @param value - Value to add
   * @returns New list length
   */
  async listPush<T>(key: string, value: T): Promise<number> {
    try {
      return await kv.lpush(key, value);
    } catch (error) {
      console.error('[Cache] List push error:', error);
      return 0;
    }
  }

  /**
   * Get list items with range
   * @param key - List key
   * @param start - Start index (default: 0)
   * @param stop - Stop index (default: -1 for all)
   * @returns Array of list items
   */
  async listRange<T>(key: string, start = 0, stop = -1): Promise<T[]> {
    try {
      return await kv.lrange<T>(key, start, stop);
    } catch (error) {
      console.error('[Cache] List range error:', error);
      return [];
    }
  }

  /**
   * Add item to set
   * @param key - Set key
   * @param members - Members to add
   * @returns Number of members added
   */
  async setAdd<T>(key: string, ...members: T[]): Promise<number> {
    try {
      return await kv.sadd(key, ...members);
    } catch (error) {
      console.error('[Cache] Set add error:', error);
      return 0;
    }
  }

  /**
   * Check if member exists in set
   * @param key - Set key
   * @param member - Member to check
   * @returns True if member exists
   */
  async setIsMember<T>(key: string, member: T): Promise<boolean> {
    try {
      return await kv.sismember(key, member);
    } catch (error) {
      console.error('[Cache] Set is member error:', error);
      return false;
    }
  }

  /**
   * Health check for cache connection
   * @returns Health status with latency
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();

    try {
      await kv.ping();
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      const latency = Date.now() - start;
      console.error('[Cache] Health check failed:', error);
      return { healthy: false, latency };
    }
  }

  /**
   * Flush all cache (USE WITH EXTREME CAUTION)
   * Only for development/testing
   */
  async flushAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot flush cache in production');
    }

    try {
      await kv.flushall();
    } catch (error) {
      console.error('[Cache] Flush all error:', error);
    }
  }

  /**
   * Sleep utility for lock waiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const cache = new CacheService();
