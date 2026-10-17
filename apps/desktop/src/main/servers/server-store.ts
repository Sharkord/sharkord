import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type { TServer } from '../../shared/types';

type TStore = {
  servers: TServer[];
  railHidden: boolean;
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
      return { servers: [], railHidden: false };
    }

    const { servers, railHidden } = parsed as Record<string, unknown>;

    return {
      servers: Array.isArray(servers) ? servers.filter(isServer) : [],
      railHidden: railHidden === true
    };
  } catch {
    // a missing or corrupt file just means a fresh start
    return { servers: [], railHidden: false };
  }
};

const writeStore = (filePath: string, store: TStore) => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(store, null, 2));
};

export { readStore, writeStore };
export type { TStore };
