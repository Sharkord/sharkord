import type { TIpInfo } from '@sharkord/shared';

const IP_CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_ENTRIES = 10_000;

type TCacheEntry = {
  data: TIpInfo;
  expiresAt: number;
};

class IpInfoCache {
  private cache = new Map<string, TCacheEntry>();

  private gc(now: number) {
    for (const [ip, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(ip);
    }

    while (this.cache.size >= MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;

      if (oldest === undefined) break;

      this.cache.delete(oldest);
    }
  }

  public get(ip: string): TIpInfo | undefined {
    const entry = this.cache.get(ip);

    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(ip);

      return undefined;
    }

    return entry.data;
  }

  public set(ip: string, data: TIpInfo) {
    const now = Date.now();

    this.gc(now);

    this.cache.set(ip, { data, expiresAt: now + IP_CACHE_TTL });
  }
}

const ipCache = new IpInfoCache();

export { ipCache };
