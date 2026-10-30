import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { z } from 'zod';
import {
  DEFAULT_SETTINGS,
  type TDesktopSettings
} from '../../shared/desktop-settings';
import type { TServer } from '../../shared/types';

type TStore = {
  servers: TServer[];
  railHidden: boolean;
  selectedId: string | null;
  settings: TDesktopSettings;
  mediaAllowedIds: string[];
};

const serverSchema: z.ZodType<TServer> = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  iconUrl: z.string().nullable()
});

const createEmptyStore = (): TStore => ({
  servers: [],
  railHidden: false,
  selectedId: null,
  settings: DEFAULT_SETTINGS,
  mediaAllowedIds: []
});

// one invalid value only resets that setting, not every other one with it
const parseSettings = (value: unknown): TDesktopSettings => {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};

  const settings = { ...DEFAULT_SETTINGS };

  for (const key of Object.keys(settings) as (keyof TDesktopSettings)[]) {
    const stored = candidate[key];

    if (typeof stored === 'boolean') {
      settings[key] = stored;
    }
  }

  return settings;
};

const keepValid = <T>(value: unknown, schema: z.ZodType<T>): T[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const parsed = schema.safeParse(item);

    return parsed.success ? [parsed.data] : [];
  });
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
      servers: keepValid(servers, serverSchema),
      railHidden: railHidden === true,
      selectedId: typeof selectedId === 'string' ? selectedId : null,
      settings: parseSettings(settings),
      mediaAllowedIds: keepValid(mediaAllowedIds, z.string())
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
