// Enterprise Redis Caching Layer
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class EnterpriseCacheService {
  private redis: Redis | null = null;
  private inMemoryFallback: Map<string, { val: string; exp: number }> = new Map();

  constructor() {
    try {
      this.redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        connectTimeout: 2000,
        lazyConnect: true
      });

      this.redis.on('error', (err: any) => {
        console.warn('Redis connection failed, running with Enterprise in-memory fallback cache.');
        this.redis = null;
      });
    } catch (e) {
      console.warn('Initializing Enterprise in-memory fallback cache.');
    }
  }

  /**
   * 1. Scoring Results Caching (TTL: 5 minutes)
   */
  async setScoringCache(key: string, data: any): Promise<void> {
    const value = JSON.stringify(data);
    const ttlSeconds = 300; // 5 minutes

    if (this.redis) {
      try {
        await this.redis.set(`scoring:${key}`, value, 'EX', ttlSeconds);
        return;
      } catch (e) {
        // Fallback
      }
    }
    this.inMemoryFallback.set(`scoring:${key}`, { val: value, exp: Date.now() + ttlSeconds * 1000 });
  }

  async getScoringCache(key: string): Promise<any | null> {
    if (this.redis) {
      try {
        const res = await this.redis.get(`scoring:${key}`);
        return res ? JSON.parse(res) : null;
      } catch (e) {
        // Fallback
      }
    }
    const item = this.inMemoryFallback.get(`scoring:${key}`);
    if (item && item.exp > Date.now()) return JSON.parse(item.val);
    if (item) this.inMemoryFallback.delete(`scoring:${key}`);
    return null;
  }

  /**
   * Invalidation triggered on task, employee, or leave changes
   */
  async invalidateScoringCache(tenantId: string): Promise<void> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`scoring:*${tenantId}*`);
        if (keys.length > 0) await this.redis.del(...keys);
        return;
      } catch (e) {
        // Fallback
      }
    }
    for (const key of this.inMemoryFallback.keys()) {
      if (key.includes(tenantId)) this.inMemoryFallback.delete(key);
    }
  }

  /**
   * 2. User Session Data Caching
   */
  async setSessionData(sessionId: string, sessionData: any): Promise<void> {
    const val = JSON.stringify(sessionData);
    if (this.redis) {
      try {
        await this.redis.set(`session:${sessionId}`, val, 'EX', 86400); // 24 hours
        return;
      } catch (e) {}
    }
    this.inMemoryFallback.set(`session:${sessionId}`, { val, exp: Date.now() + 86400000 });
  }

  async getSessionData(sessionId: string): Promise<any | null> {
    if (this.redis) {
      try {
        const res = await this.redis.get(`session:${sessionId}`);
        return res ? JSON.parse(res) : null;
      } catch (e) {}
    }
    const item = this.inMemoryFallback.get(`session:${sessionId}`);
    return item && item.exp > Date.now() ? JSON.parse(item.val) : null;
  }

  /**
   * 3. Frequently-Read Configuration Caching
   */
  async setConfigCache(tenantId: string, config: any): Promise<void> {
    const val = JSON.stringify(config);
    if (this.redis) {
      try {
        await this.redis.set(`config:${tenantId}`, val, 'EX', 3600); // 1 hour
        return;
      } catch (e) {}
    }
    this.inMemoryFallback.set(`config:${tenantId}`, { val, exp: Date.now() + 3600000 });
  }

  async getConfigCache(tenantId: string): Promise<any | null> {
    if (this.redis) {
      try {
        const res = await this.redis.get(`config:${tenantId}`);
        return res ? JSON.parse(res) : null;
      } catch (e) {}
    }
    const item = this.inMemoryFallback.get(`config:${tenantId}`);
    return item && item.exp > Date.now() ? JSON.parse(item.val) : null;
  }
}

export const cacheService = new EnterpriseCacheService();
