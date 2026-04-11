type TModifier = 'shift' | 'control' | 'alt' | 'meta';
type TAction = {
  action: () => void;
};

const normalizeKey = (key: string) => replaceMetaWithControl(key.toLowerCase());

const replaceMetaWithControl = (key: string) =>
  key === 'meta' ? 'control' : key;

const getNormalizedShortcutHash = (keys: string[]) => {
  const sortedKeys = [...new Set(keys.map(normalizeKey))].sort();
  return sortedKeys.join('+');
};

const getShortcutHash = (modifiers: string[], key: string) => {
  const sortedKeys = [...modifiers, key].map(normalizeKey).sort();
  return getNormalizedShortcutHash(sortedKeys);
};

const getShortcutHashFromSet = (keys: Set<string>) => {
  const sortedKeys = [...keys].map(normalizeKey).sort();
  return getNormalizedShortcutHash(sortedKeys);
};

const getShortcutHashFromString = (shortcut: string) => {
  const splitShortcut = shortcut.split('+').map((part) => part.trim());
  return getNormalizedShortcutHash(splitShortcut);
};

class HotkeyShortcutRegistrar {
  private hotkeyShortcuts = new Map<string, TAction>();

  public has = (shortcutHash: string) => {
    return this.hotkeyShortcuts.has(shortcutHash);
  };

  public submit = (pressedKeys: Set<string>, e: KeyboardEvent) => {
    const hash = getShortcutHashFromSet(pressedKeys);
    if (this.has(hash)) {
      e.preventDefault();
      this.invoke(hash);
    } else if (hash === 'alt') {
      e.preventDefault();
    }
  };

  public invoke = (shortcutHash: string) => {
    if (this.has(shortcutHash)) {
      this.get(shortcutHash)?.action();
    }
  };

  public register = (
    modifiers: TModifier[],
    key: string,
    action: () => void
  ) => {
    const shortcutHash = getShortcutHash(modifiers, key);
    const entry: TAction = { action };
    this.set(shortcutHash, entry);
  };

  public registerBatch = (
    ...entries: { modifiers: TModifier[]; key: string; action: () => void }[]
  ) => {
    entries.forEach(({ modifiers, key, action }) => {
      this.register(modifiers, key, action);
    });
  };

  public registerCustom = (shortcut: string, action: () => void) => {
    const shortcutHash = getShortcutHashFromString(shortcut);
    const entry: TAction = { action };
    this.set(shortcutHash, entry);
  };

  public deregister = (modifiers: TModifier[], key: string) => {
    const shortcutHash = getShortcutHash(modifiers, key);
    this.delete(shortcutHash);
  };

  public deregisterCustom = (shortcut: string) => {
    const shortcutHash = getShortcutHashFromString(shortcut);
    this.delete(shortcutHash);
  };

  public deregisterBatch = (
    ...entries: { modifiers: TModifier[]; key: string }[]
  ) => {
    entries.forEach(({ modifiers, key }) => {
      this.deregister(modifiers, key);
    });
  };

  private get = (shortcutHash: string) => {
    return this.hotkeyShortcuts.get(shortcutHash);
  };

  private set = (shortcutHash: string, entry: TAction) => {
    this.hotkeyShortcuts.set(shortcutHash, entry);
  };

  private delete = (shortcutHash: string) => {
    this.hotkeyShortcuts.delete(shortcutHash);
  };
}

const ShortcutRegistrar = new HotkeyShortcutRegistrar();

export { ShortcutRegistrar };
