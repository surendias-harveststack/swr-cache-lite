import { describe, it, expect, vi } from "vitest";
import { createCache } from "./index.js";

describe("swr-cache-lite", () => {
  it("serves fresh, then stale while revalidating", async () => {
    let counter = 0;
    const fetcher = vi.fn(async () => (++counter));

    const cache = createCache({ ttlMs: 50, staleTtlMs: 200 });

    const a = await cache.wrap("k", fetcher); // fetches 1
    expect(a).toBe(1);
    await new Promise(r => setTimeout(r, 10));
    const b = await cache.wrap("k", fetcher); // fresh → still 1
    expect(b).toBe(1);

    // make it stale but within stale window
    await new Promise(r => setTimeout(r, 60));
    const c = await cache.wrap("k", fetcher); // returns stale 1, schedules refresh
    expect(c).toBe(1);

    // let background refresh finish
    await new Promise(r => setTimeout(r, 10));
    const d = await cache.wrap("k", fetcher); // now fresh 2
    expect(d).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
