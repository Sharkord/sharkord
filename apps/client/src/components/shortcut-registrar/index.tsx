type TModifier = 'shift' | 'control' | 'alt' | 'meta';
const ModifierArray: TModifier[] = ['shift', 'control', 'alt', 'meta'];
type THotkeyEntry = {
  modifiers: TModifier[];
  key: string;
  action: () => void;
};

const normalizeKey = (key: string) => replaceMetaWithControl(key.toLowerCase());

const replaceMetaWithControl = (key: string) =>
  key === 'meta' ? 'control' : key;

const getShortcutHashFromSet = (keys: Set<string>) => {
  const sortedKeys = [...keys].map(normalizeKey).sort();
  return `${sortedKeys.join('+')}`;
};

const getShortcutHash = (modifiers: string[], key: string) => {
  const normalizedModifiers = modifiers.map(normalizeKey);
  const normalizedKey = normalizeKey(key);
  const sortedKeys = [...normalizedModifiers, normalizedKey].sort();
  return `${sortedKeys.join('+')}`;
};

class THotkeyShortcutRegistrar {
  private hotkeyShortcuts = new Map<string, THotkeyEntry>();

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
    const entry: THotkeyEntry = {
      modifiers,
      key,
      action
    };
    this.set(shortcutHash, entry);
  };

  public registerBatch = (
    entries: { modifiers: TModifier[]; key: string; action: () => void }[]
  ) => {
    entries.forEach(({ modifiers, key, action }) => {
      this.register(modifiers, key, action);
    });
  };

  public registerCustom = (shortcut: string, action: () => void) => {
    const splitShortcut = shortcut.split('+').map((part) => part.trim());
    const normalizedShortcut = splitShortcut.map(normalizeKey).sort().join('+');
    const entry: THotkeyEntry = {
      modifiers: splitShortcut.filter((part) =>
        ModifierArray.includes(part as TModifier)
      ) as TModifier[],
      key:
        splitShortcut.find(
          (part) => !ModifierArray.includes(part as TModifier)
        ) || '',
      action
    };
    this.set(normalizedShortcut, entry);
  };

  public deregister = (modifiers: TModifier[], key: string) => {
    const shortcutHash = getShortcutHash(modifiers, key);
    this.delete(shortcutHash);
  };

  private get = (shortcutHash: string) => {
    return this.hotkeyShortcuts.get(shortcutHash);
  };

  private set = (shortcutHash: string, entry: THotkeyEntry) => {
    this.hotkeyShortcuts.set(shortcutHash, entry);
  };

  private delete = (shortcutHash: string) => {
    this.hotkeyShortcuts.delete(shortcutHash);
  };
}

const ShortcutRegistrar = new THotkeyShortcutRegistrar();

export { ShortcutRegistrar };
