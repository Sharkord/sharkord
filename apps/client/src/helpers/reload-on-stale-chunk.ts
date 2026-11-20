import {
  getSessionStorageItem,
  SessionStorageKey,
  setSessionStorageItem
} from './storage';

const MIN_RELOAD_INTERVAL_MS = 10_000;

const reloadOnStaleChunk = () => {
  window.addEventListener('vite:preloadError', () => {
    const lastReloadAt = Number(
      getSessionStorageItem(SessionStorageKey.STALE_CHUNK_RELOAD_AT) ?? 0
    );

    if (Date.now() - lastReloadAt < MIN_RELOAD_INTERVAL_MS) return;

    setSessionStorageItem(
      SessionStorageKey.STALE_CHUNK_RELOAD_AT,
      Date.now().toString()
    );

    window.location.reload();
  });
};

export { reloadOnStaleChunk };
