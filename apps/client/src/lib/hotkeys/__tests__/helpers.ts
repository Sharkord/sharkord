// bun has no localStorage, so storage backed code needs a stand in per test
const installFakeLocalStorage = () => {
  const original = globalThis.localStorage;
  const store = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key)
    }
  });

  return () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      writable: true,
      value: original
    });
  };
};

export { installFakeLocalStorage };
