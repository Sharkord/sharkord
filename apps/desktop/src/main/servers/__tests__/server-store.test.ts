import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import type { TServer } from '../../../shared/types';
import { readStore, writeStore } from '../server-store';

const SERVER: TServer = {
  id: 'abc',
  name: 'Home',
  url: 'https://home.example.com',
  iconUrl: null
};

const OTHER: TServer = {
  id: 'def',
  name: 'Work',
  url: 'https://work.example.com',
  iconUrl: 'https://work.example.com/public/logo.png'
};

describe('server store', () => {
  let dir = '';
  let filePath = '';

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'sharkord-desktop-'));
    filePath = path.join(dir, 'servers.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('starts empty and visible when nothing was saved yet', () => {
    expect(readStore(filePath)).toEqual({ servers: [], railHidden: false });
  });

  test('returns saved servers in order', () => {
    writeStore(filePath, { servers: [SERVER, OTHER], railHidden: false });

    expect(readStore(filePath).servers).toEqual([SERVER, OTHER]);
  });

  test('remembers that the server list was hidden', () => {
    writeStore(filePath, { servers: [SERVER], railHidden: true });

    expect(readStore(filePath).railHidden).toBe(true);
  });

  test('creates missing parent folders when saving', () => {
    const nested = path.join(dir, 'a', 'b', 'servers.json');

    writeStore(nested, { servers: [SERVER], railHidden: false });

    expect(readStore(nested).servers).toEqual([SERVER]);
  });

  test('a later save replaces the earlier one', () => {
    writeStore(filePath, { servers: [SERVER, OTHER], railHidden: true });
    writeStore(filePath, { servers: [OTHER], railHidden: false });

    expect(readStore(filePath)).toEqual({
      servers: [OTHER],
      railHidden: false
    });
  });

  test('starts fresh for a corrupt file', () => {
    writeFileSync(filePath, '{not json');

    expect(readStore(filePath)).toEqual({ servers: [], railHidden: false });
  });

  test('starts fresh when the file is not an object', () => {
    writeFileSync(filePath, JSON.stringify([SERVER]));

    expect(readStore(filePath)).toEqual({ servers: [], railHidden: false });
  });

  test('drops entries that are not servers', () => {
    writeFileSync(
      filePath,
      JSON.stringify({
        servers: [SERVER, { id: 1 }, null, 'text', { ...OTHER, url: 5 }]
      })
    );

    expect(readStore(filePath).servers).toEqual([SERVER]);
  });
});
