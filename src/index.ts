export type Millis = number;

export interface CacheValue<T> {
  value: T;
  updatedAt: number; // ms epoch
}

export interface StorageAdapter {
  get<T>(key: string): Promise<CacheValue<T> | undefined>;
  set<T>(key: string, value: CacheValue<T>): Promise<void>;
  del(key: string): Promise<void>;
}

class MemoryStorage implements StorageAdapter {
  private map = new Map<string, CacheValue<unknown>>();
  async get<T>(key: string) { return this.map.get(key) as CacheValue<T> | undefined; }
  async set<T>(key: string, value: CacheValue<T>) { this.map.set(key, value); }
  async del(key: string) { this.map.delete(key); }
}

export interface CreateCacheOptions {
  ttlMs: Millis;           // time considered "fresh"
  staleTtlMs?: Millis;     // how long stale values can be served while revalidating
  storage?: StorageAdapter; // default: in-memory
  onUpdate?<T>(key: string, value: T): void | Promise<void>;
}

export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, val: T): Promise<void>;
  del(key: string): Promise<void>;
  wrap<T>(key: string, fetcher: () => Promise<T>): Promise<T>;
}

export function createCache(opts: CreateCacheOptions): Cache {
  const ttl = opts.ttlMs;
  const staleTtl = opts.staleTtlMs ?? 0;
  const store = opts.storage ?? new MemoryStorage();
  const inflight = new Map<string, Promise<unknown>>();

  function isFresh(updatedAt: number) {
    return Date.now() - updatedAt <= ttl;
  }
  function isStaleButServeable(updatedAt: number) {
    return Date.now() - updatedAt <= ttl + staleTtl;
  }

  return {
    async get<T>(key: string) {
      const rec = await store.get<T>(key);
      return rec?.value;
    },
    async set<T>(key: string, val: T) {
      await store.set<T>(key, { value: val, updatedAt: Date.now() });
      void opts.onUpdate?.(key, val);
    },
    async del(key: string) {
      await store.del(key);
    },
    async wrap<T>(key: string, fetcher: () => Promise<T>) {
      const existing = await store.get<T>(key);
      if (existing) {
        if (isFresh(existing.updatedAt)) {
          return existing.value;
        }
        if (isStaleButServeable(existing.updatedAt)) {
          // kick off background refresh if not inflight
          if (!inflight.has(key)) {
            const p = (async () => {
              try {
                const fresh = await fetcher();
                await store.set<T>(key, { value: fresh, updatedAt: Date.now() });
                void opts.onUpdate?.(key, fresh);
              } finally {
                inflight.delete(key);
              }
            })();
            inflight.set(key, p);
          }
          return existing.value; // serve stale fast
        }
        // expired beyond stale window → fetch new
      }

      // No cache or too old → fetch and cache (deduplicate concurrent)
      if (inflight.has(key)) {
        return inflight.get(key)! as Promise<T>;
      }
      const p = (async () => {
        const fresh = await fetcher();
        await store.set<T>(key, { value: fresh, updatedAt: Date.now() });
        void opts.onUpdate?.(key, fresh);
        return fresh;
      })();
      inflight.set(key, p);
      try { return await p as T; }
      finally { inflight.delete(key); }
    }
  };
}
