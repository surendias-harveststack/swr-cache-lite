// Peer dep: ioredis or redis client; we keep signature generic to avoid lock-in
export interface SimpleRedis {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

import type { CacheValue, StorageAdapter } from "./index.js";

export function createRedisAdapter(client: SimpleRedis, prefix = "swr:"): StorageAdapter {
  return {
    async get<T>(key: string) {
      const raw = await client.get(prefix + key);
      return raw ? JSON.parse(raw) as CacheValue<T> : undefined;
    },
    async set<T>(key: string, value: CacheValue<T>) {
      await client.set(prefix + key, JSON.stringify(value));
    },
    async del(key: string) {
      await client.del(prefix + key);
    }
  };
}
