# swr-cache-lite

Tiny **stale-while-revalidate** cache for async functions (Node & serverless). Optional Redis adapter.  
**Author:** Suren Dias

[Repo](https://github.com/surendias-harveststack/swr-cache-lite) ·
[Issues](https://github.com/surendias-harveststack/swr-cache-lite/issues) ·
[Funding](https://github.com/sponsors/surendias-harveststack) ·
[License: MIT](#license)

---

## Why?

- **Fast first response** with cached data.
- **Background refresh** keeps results fresh.
- **Pluggable storage** (in-memory by default, Redis optional).
- **Typed** out of the box (`.d.ts` shipped).
- **ESM + CJS** via `"exports"` map.

> Requires **Node.js ≥ 18**.

---

## Install

```bash
npm i swr-cache-lite
# optional (only if you want Redis storage)
npm i ioredis
```

---

## Quick start (60s)

```ts
import { createCache } from "swr-cache-lite";

const cache = createCache({
  ttlMs: 60_000,         // fresh for 60s
  staleTtlMs: 5 * 60_000 // serve stale up to 5 min while revalidating
});

async function getExchangeRates() {
  return cache.wrap("rates", async () => {
    const res = await fetch("https://api.exchangerate.host/latest");
    if (!res.ok) throw new Error("fetch failed");
    return res.json();
  });
}

// later in your handler:
const rates = await getExchangeRates();
```

**Behavior**
- First call → fetch & cache.
- Within `ttlMs` → serve fresh.
- Between `ttlMs` and `ttlMs + staleTtlMs` → serve stale immediately and refresh in background.
- After `ttlMs + staleTtlMs` → wait for a new fetch.

---

## Redis (optional)

```ts
import { createCache } from "swr-cache-lite";
import { createRedisAdapter } from "swr-cache-lite/redis-adapter";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const cache = createCache({
  ttlMs: 30_000,
  staleTtlMs: 2 * 60_000,
  storage: createRedisAdapter(redis, "myapp:")
});
```

> `ioredis` is declared as an **optional peerDependency**. Install it only if you use Redis.

---

## API

### `createCache(options): Cache`

**Options**
- `ttlMs: number` – how long a value is considered **fresh**.
- `staleTtlMs?: number` – additional window to **serve stale** while revalidating (default `0`).
- `storage?: StorageAdapter` – custom storage (default: in-memory).
- `onUpdate?<T>(key: string, value: T)` – optional callback after the cache updates.

**Cache methods**
- `get<T>(key): Promise<T | undefined>`
- `set<T>(key, value): Promise<void>`
- `del(key): Promise<void>`
- `wrap<T>(key, fetcher: () => Promise<T>): Promise<T>` — SWR orchestration with inflight dedupe.

### `StorageAdapter`

```ts
interface CacheValue<T> { value: T; updatedAt: number; }

interface StorageAdapter {
  get<T>(key: string): Promise<CacheValue<T> | undefined>;
  set<T>(key: string, value: CacheValue<T>): Promise<void>;
  del(key: string): Promise<void>;
}
```

### Redis adapter

```ts
export function createRedisAdapter(client: SimpleRedis, prefix = "swr:"): StorageAdapter;

interface SimpleRedis {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
}
```

---

## Usage with Express (example)

```ts
import express from "express";
import { createCache } from "swr-cache-lite";
const app = express();

const cache = createCache({ ttlMs: 10_000, staleTtlMs: 60_000 });

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const user = await cache.wrap(`user:${id}`, async () => {
    // expensive DB/API call
    return fetchUserFromDB(id);
  });
  res.json(user);
});

app.listen(3000);
```

---

## ESM & CommonJS

```ts
// ESM
import { createCache } from "swr-cache-lite";
import { createRedisAdapter } from "swr-cache-lite/redis-adapter";

// CommonJS
const { createCache } = require("swr-cache-lite");
const { createRedisAdapter } = require("swr-cache-lite/redis-adapter");
```

Exports map:
```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
    "./redis-adapter": {
      "types": "./dist/redis-adapter.d.ts",
      "import": "./dist/redis-adapter.js",
      "require": "./dist/redis-adapter.cjs"
    }
  }
}
```

---

## Scripts

From `package.json`:

- `build` – bundle with **tsup** (ESM + CJS + types).
- `dev` – watch mode.
- `test` / `test:watch` – run **Vitest**.
- `release` – version with **Changesets**, build, and publish.
- `prepare` – setup **Husky** (git hooks).

---

## Requirements

- Node.js **≥ 18**
- Optional peer: `ioredis` (only if using the Redis adapter)

---

## Contributing

Issues and PRs welcome!  
- Bugs: <https://github.com/surendias-harveststack/swr-cache-lite/issues>  
- Repo: <https://github.com/surendias-harveststack/swr-cache-lite>

If this project helps you, consider sponsoring:  
<https://github.com/sponsors/surendias-harveststack>

---

## License

MIT © Suren Dias
