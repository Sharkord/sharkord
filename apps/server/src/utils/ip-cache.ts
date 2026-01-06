const IP_CACHE_TTL = 1000 * 60 * 60; // 1 hour

class IpInfoCache {
  private cache: Record<string, any>;

  constructor() {
    this.cache = {};
  }

  get(ip: string) {
    return this.cache[ip];
  }

  set(ip: string, data: any) {
    this.cache[ip] = data;

    setTimeout(() => {
      delete this.cache[ip];
    }, IP_CACHE_TTL);
  }
}

const ipCache = new IpInfoCache();

export { ipCache };
