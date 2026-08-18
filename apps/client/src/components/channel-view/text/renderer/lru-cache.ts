const MAX_CACHE_SIZE = 500;

// least recently used, not insertion order: someone scrolling upwards re-renders
// the oldest messages first, so FIFO evicted exactly what was about to be needed
const readFromCache = <T>(cache: Map<string, T>, key: string) => {
  if (!cache.has(key)) return undefined;

  const value = cache.get(key)!;

  cache.delete(key);
  cache.set(key, value);

  return value;
};

const writeToCache = <T>(cache: Map<string, T>, key: string, value: T) => {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, value);
};

export { readFromCache, writeToCache };
