// Cache module — simple in-memory async/sync cache

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions<T> {
  ttlMs?: number;
  compute?: () => T | Promise<T>;
}

export function createAsyncCache<T = any>(options?: CacheOptions<T>) {
  const cache = new Map<string, CacheEntry<T>>();
  const ttlMs = options?.ttlMs ?? 60_000;
  const compute = options?.compute;

  return {
    get: async (key: string = "default"): Promise<T | null> => {
      const entry = cache.get(key);
      if (entry && Date.now() - entry.timestamp < ttlMs) {
        return entry.data;
      }
      if (compute) {
        const data = await compute();
        cache.set(key, { data, timestamp: Date.now() });
        return data;
      }
      return entry?.data ?? null;
    },
    set: (key: string, data: T) => cache.set(key, { data, timestamp: Date.now() }),
    has: (key: string) => cache.has(key),
    delete: (key: string) => cache.delete(key),
    invalidate: () => cache.clear(),
  };
}

export function createCache<T = any>(options?: CacheOptions<T>) {
  const cache = new Map<string, CacheEntry<T>>();
  const ttlMs = options?.ttlMs ?? 60_000;
  const compute = options?.compute;

  return {
    get: (key: string = "default"): T | null => {
      const entry = cache.get(key);
      if (entry && Date.now() - entry.timestamp < ttlMs) return entry.data;
      if (compute) {
        const data = compute();
        cache.set(key, { data: data as T, timestamp: Date.now() });
        return data as T;
      }
      return entry?.data ?? null;
    },
    set: (key: string, data: T) => cache.set(key, { data, timestamp: Date.now() }),
    has: (key: string) => cache.has(key),
    delete: (key: string) => cache.delete(key),
    invalidate: () => cache.clear(),
  };
}
