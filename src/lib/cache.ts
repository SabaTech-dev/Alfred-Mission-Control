// Cache module — simple in-memory async/sync cache

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions<T> {
  ttlMs?: number;
  compute?: () => T | Promise<T>;
}

// Security: limit max cache entries to prevent memory exhaustion
const MAX_CACHE_SIZE = 1000;

// Security: validate cache key to prevent injection
function validateKey(key: string): boolean {
  return /^[a-zA-Z0-9_\-:.]+$/.test(key) && key.length <= 256;
}

export function createAsyncCache<T = any>(options?: CacheOptions<T>) {
  const cache = new Map<string, CacheEntry<T>>();
  const ttlMs = options?.ttlMs ?? 60_000;
  const compute = options?.compute;

  // Security: cleanup expired entries and enforce size limit
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now - entry.timestamp >= ttlMs) {
        cache.delete(key);
      }
    }
    // If still over limit, remove oldest entries
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
      for (const [key] of toRemove) {
        cache.delete(key);
      }
    }
  };

  return {
    get: async (key: string = "default"): Promise<T | null> => {
      if (!validateKey(key)) {
        console.error("[Cache] Invalid cache key:", key);
        return null;
      }
      const entry = cache.get(key);
      if (entry && Date.now() - entry.timestamp < ttlMs) {
        return entry.data;
      }
      if (compute) {
        const data = await compute();
        cache.set(key, { data, timestamp: Date.now() });
        cleanup();
        return data;
      }
      return entry?.data ?? null;
    },
    set: (key: string, data: T) => {
      if (!validateKey(key)) {
        console.error("[Cache] Invalid cache key:", key);
        return;
      }
      cache.set(key, { data, timestamp: Date.now() });
      cleanup();
    },
    has: (key: string) => {
      if (!validateKey(key)) {
        console.error("[Cache] Invalid cache key:", key);
        return false;
      }
      return cache.has(key);
    },
    delete: (key: string) => {
      if (!validateKey(key)) {
        console.error("[Cache] Invalid cache key:", key);
        return;
      }
      return cache.delete(key);
    },
    invalidate: () => cache.clear(),
    getSize: () => cache.size,
  };
}

export function createCache<T = any>(options?: CacheOptions<T>) {
  const cache = new Map<string, CacheEntry<T>>();
  const ttlMs = options?.ttlMs ?? 60_000;
  const compute = options?.compute;

  // Security: cleanup expired entries and enforce size limit
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now - entry.timestamp >= ttlMs) {
        cache.delete(key);
      }
    }
    // If still over limit, remove oldest entries
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
      for (const [key] of toRemove) {
        cache.delete(key);
      }
    }
  };

  return {
    get: (key: string = "default"): T | null => {
      if (!validateKey(key)) {
        console.error("[Cache] Invalid cache key:", key);
        return null;
      }
      const entry = cache.get(key);
      if (entry && Date.now() - entry.timestamp < ttlMs) return entry.data;
      if (compute) {
        const data = compute();
        cache.set(key, { data: data as T, timestamp: Date.now() });
        cleanup();
        return data as T;
      }
      return entry?.data ?? null;
    },
    set: (key: string, data: T) => {
      if (!validateKey(key)) {
        console.error("[Cache] Invalid cache key:", key);
        return;
      }
      cache.set(key, { data, timestamp: Date.now() });
      cleanup();
    },
    has: (key: string) => {
      if (!validateKey(key)) {
        console.error("[Cache] Invalid cache key:", key);
        return false;
      }
      return cache.has(key);
    },
    delete: (key: string) => {
      if (!validateKey(key)) {
        console.error("[Cache] Invalid cache key:", key);
        return;
      }
      return cache.delete(key);
    },
    invalidate: () => cache.clear(),
    getSize: () => cache.size,
  };
}
