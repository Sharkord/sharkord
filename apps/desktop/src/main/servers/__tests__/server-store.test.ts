import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import type { TServer } from '../../../shared/types';
import { DEFAULT_SETTINGS, readStore, writeStore } from '../server-store';

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
    expect(readStore(filePath)).toEqual({
      servers: [],
      railHidden: false,
      selectedId: null,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: []
    });
  });

  test('returns saved servers in order', () => {
    writeStore(filePath, {
      servers: [SERVER, OTHER],
      railHidden: false,
      selectedId: null,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: []
    });

    expect(readStore(filePath).servers).toEqual([SERVER, OTHER]);
  });

  test('remembers that the server list was hidden', () => {
    writeStore(filePath, {
      servers: [SERVER],
      railHidden: true,
      selectedId: null,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: []
    });

    expect(readStore(filePath).railHidden).toBe(true);
  });

  test('remembers the selected server', () => {
    writeStore(filePath, {
      servers: [SERVER, OTHER],
      railHidden: false,
      selectedId: OTHER.id,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: []
    });

    expect(readStore(filePath).selectedId).toBe(OTHER.id);
  });

  test('ignores a selected server that is not a string', () => {
    writeFileSync(
      filePath,
      JSON.stringify({ servers: [SERVER], selectedId: 5 })
    );

    expect(readStore(filePath).selectedId).toBeNull();
  });

  test('remembers the desktop settings', () => {
    writeStore(filePath, {
      servers: [SERVER],
      railHidden: false,
      selectedId: null,
      settings: {
        connectAllOnStartup: true,
        throttleHiddenServers: false,
        autoStart: true,
        closeToTray: true,
        startToTray: true,
        dynamicTrayIcon: false,
        autoUpdate: false
      },
      mediaAllowedIds: []
    });

    expect(readStore(filePath).settings).toEqual({
      connectAllOnStartup: true,
      throttleHiddenServers: false,
      autoStart: true,
      closeToTray: true,
      startToTray: true,
      dynamicTrayIcon: false,
      autoUpdate: false
    });
  });

  test('falls back to the default settings for missing or invalid values', () => {
    writeFileSync(
      filePath,
      JSON.stringify({
        servers: [SERVER],
        settings: {
          connectAllOnStartup: 'yes',
          throttleHiddenServers: 0,
          autoStart: 1,
          closeToTray: 'yes',
          startToTray: 'true',
          dynamicTrayIcon: 'no',
          autoUpdate: 0
        }
      })
    );

    expect(readStore(filePath).settings).toEqual({
      connectAllOnStartup: false,
      throttleHiddenServers: true,
      autoStart: false,
      closeToTray: DEFAULT_SETTINGS.closeToTray,
      startToTray: false,
      dynamicTrayIcon: true,
      autoUpdate: true
    });
  });

  test('a fresh start has auto start and start to tray off, throttling, the server logo icon and auto update on', () => {
    expect(readStore(filePath).settings).toEqual({
      connectAllOnStartup: false,
      throttleHiddenServers: true,
      autoStart: false,
      closeToTray: process.platform === 'win32',
      startToTray: false,
      dynamicTrayIcon: true,
      autoUpdate: true
    });
  });

  test('the server logo icon turned off is kept', () => {
    writeFileSync(
      filePath,
      JSON.stringify({
        servers: [SERVER],
        settings: { dynamicTrayIcon: false }
      })
    );

    expect(readStore(filePath).settings.dynamicTrayIcon).toBe(false);
  });

  test('closing to the tray is on by default only on windows, where a tray always exists', () => {
    expect(DEFAULT_SETTINGS.closeToTray).toBe(process.platform === 'win32');
  });

  test('a closing to the tray turned off is kept, also on windows', () => {
    writeFileSync(
      filePath,
      JSON.stringify({ servers: [SERVER], settings: { closeToTray: false } })
    );

    expect(readStore(filePath).settings.closeToTray).toBe(false);
  });

  test('remembers the servers allowed to use the microphone and camera', () => {
    writeStore(filePath, {
      servers: [SERVER, OTHER],
      railHidden: false,
      selectedId: null,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: [OTHER.id]
    });

    expect(readStore(filePath).mediaAllowedIds).toEqual([OTHER.id]);
  });

  test('drops media grants that are not server ids and starts without any', () => {
    expect(readStore(filePath).mediaAllowedIds).toEqual([]);

    writeFileSync(
      filePath,
      JSON.stringify({
        servers: [SERVER],
        mediaAllowedIds: [SERVER.id, 5, null]
      })
    );

    expect(readStore(filePath).mediaAllowedIds).toEqual([SERVER.id]);
  });

  test('creates missing parent folders when saving', () => {
    const nested = path.join(dir, 'a', 'b', 'servers.json');

    writeStore(nested, {
      servers: [SERVER],
      railHidden: false,
      selectedId: null,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: []
    });

    expect(readStore(nested).servers).toEqual([SERVER]);
  });

  test('a later save replaces the earlier one', () => {
    writeStore(filePath, {
      servers: [SERVER, OTHER],
      railHidden: true,
      selectedId: null,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: []
    });
    writeStore(filePath, {
      servers: [OTHER],
      railHidden: false,
      selectedId: null,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: []
    });

    expect(readStore(filePath)).toEqual({
      servers: [OTHER],
      railHidden: false,
      selectedId: null,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: []
    });
  });

  test('starts fresh for a corrupt file', () => {
    writeFileSync(filePath, '{not json');

    expect(readStore(filePath)).toEqual({
      servers: [],
      railHidden: false,
      selectedId: null,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: []
    });
  });

  test('starts fresh when the file is not an object', () => {
    writeFileSync(filePath, JSON.stringify([SERVER]));

    expect(readStore(filePath)).toEqual({
      servers: [],
      railHidden: false,
      selectedId: null,
      settings: DEFAULT_SETTINGS,
      mediaAllowedIds: []
    });
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
