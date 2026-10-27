import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type { TDesktopSettings, TServer } from '../../shared/types';

type TStore = {
  servers: TServer[];
  railHidden: boolean;
  selectedId: string | null;
  settings: TDesktopSettings;
  mediaAllowedIds: string[];
};

const DEFAULT_SETTINGS: TDesktopSettings = {
  connectAllOnStartup: false,
  throttleHiddenServers: true,
  autoStart: false,
  closeToTray: process.platform === 'win32',
  startToTray: false,
  autoUpdate: true
};

const createEmptyStore = (): TStore => ({
  servers: [],
  railHidden: false,
  selectedId: null,
  settings: DEFAULT_SETTINGS,
  mediaAllowedIds: []
});

const parseSettings = (value: unknown): TDesktopSettings => {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    connectAllOnStartup: candidate.connectAllOnStartup === true,
    throttleHiddenServers: candidate.throttleHiddenServers !== false,
    autoStart: candidate.autoStart === true,
    closeToTray:
      typeof candidate.closeToTray === 'boolean'
        ? candidate.closeToTray
        : DEFAULT_SETTINGS.closeToTray,
    startToTray: candidate.startToTray === true,
    autoUpdate: candidate.autoUpdate !== false
  };
};

const isServer = (value: unknown): value is TServer => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.url === 'string' &&
    (typeof candidate.iconUrl === 'string' || candidate.iconUrl === null)
  );
};

const readStore = (filePath: string): TStore => {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      return createEmptyStore();
    }

    const { servers, railHidden, selectedId, settings, mediaAllowedIds } =
      parsed as Record<string, unknown>;

    return {
      servers: Array.isArray(servers) ? servers.filter(isServer) : [],
      railHidden: railHidden === true,
      selectedId: typeof selectedId === 'string' ? selectedId : null,
      settings: parseSettings(settings),
      mediaAllowedIds: Array.isArray(mediaAllowedIds)
        ? mediaAllowedIds.filter((id): id is string => typeof id === 'string')
        : []
    };
  } catch {
    // a missing or corrupt file just means a fresh start
    return createEmptyStore();
  }
};

const writeStore = (filePath: string, store: TStore) => {
  mkdirSync(dirname(filePath), { recursive: true });

  // renamed into place so a crash mid-write cannot leave a corrupt file behind
  const tempPath = `${filePath}.tmp`;

  writeFileSync(tempPath, JSON.stringify(store, null, 2));
  renameSync(tempPath, filePath);
};

export { DEFAULT_SETTINGS, readStore, writeStore };
