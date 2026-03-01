import { getLocalStorageItem, LocalStorageKey } from './storage';

const OVERRIDE_DEBUG = true;

const localStorageDebug = getLocalStorageItem(LocalStorageKey.DEBUG);

const isDebug = () => {
  return !!window.DEBUG || OVERRIDE_DEBUG || !!localStorageDebug;
};

export { isDebug };
