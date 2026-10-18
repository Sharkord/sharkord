import { describe, expect, test } from 'bun:test';
import { addServerCall } from '../add-server';
import { getRailVisibleCall } from '../get-rail-visible';
import { getStateCall } from '../get-state';
import { openSettingsCall } from '../open-settings';
import { removeServerCall } from '../remove-server';
import { selectServerCall } from '../select-server';
import { setAddingCall } from '../set-adding';
import { setOverlayCall } from '../set-overlay';
import { setRailHiddenCall } from '../set-rail-hidden';
import { setSettingsOpenCall } from '../set-settings-open';
import { toggleMenuBarCall } from '../toggle-menu-bar';
import { togglePerformanceOverlayCall } from '../toggle-performance-overlay';
import { toggleRailCall } from '../toggle-rail';
import { updateSettingsCall } from '../update-settings';

// the handlers themselves need electron's ipcMain, only what they accept is covered here
describe('ipc request arguments', () => {
  test.each([
    ['get state', getStateCall],
    ['get rail visible', getRailVisibleCall],
    ['toggle rail', toggleRailCall],
    ['open settings', openSettingsCall],
    ['toggle performance overlay', togglePerformanceOverlayCall],
    ['toggle menu bar', toggleMenuBarCall]
  ])('%s takes no arguments', (_name, call) => {
    expect(call.args.safeParse([]).success).toBe(true);
    expect(call.args.safeParse(['extra']).success).toBe(false);
  });

  test.each([
    ['select server', selectServerCall],
    ['remove server', removeServerCall]
  ])('%s takes a single server id', (_name, call) => {
    expect(call.args.safeParse(['abc']).success).toBe(true);
    expect(call.args.safeParse([1]).success).toBe(false);
    expect(call.args.safeParse([]).success).toBe(false);
    expect(call.args.safeParse(['abc', 'def']).success).toBe(false);
  });

  test.each([
    ['set adding', setAddingCall],
    ['set overlay', setOverlayCall],
    ['set rail hidden', setRailHiddenCall],
    ['set settings open', setSettingsOpenCall]
  ])('%s takes a single boolean', (_name, call) => {
    expect(call.args.safeParse([true]).success).toBe(true);
    expect(call.args.safeParse([false]).success).toBe(true);
    expect(call.args.safeParse(['true']).success).toBe(false);
    expect(call.args.safeParse([undefined]).success).toBe(false);
  });

  test('update settings takes known settings only', () => {
    const { args } = updateSettingsCall;

    expect(args.safeParse([{ connectAllOnStartup: true }]).success).toBe(true);
    expect(args.safeParse([{ throttleHiddenServers: false }]).success).toBe(
      true
    );
    expect(args.safeParse([{}]).success).toBe(true);
    expect(args.safeParse([{ connectAllOnStartup: 'yes' }]).success).toBe(
      false
    );
    expect(args.safeParse([{ unknown: true }]).success).toBe(false);
    expect(args.safeParse([]).success).toBe(false);
  });

  test('add server takes an address of reasonable length', () => {
    const { args } = addServerCall;

    expect(args.safeParse(['chat.example.com']).success).toBe(true);
    expect(args.safeParse(['a'.repeat(2049)]).success).toBe(false);
    expect(args.safeParse([5]).success).toBe(false);
    expect(args.safeParse([]).success).toBe(false);
  });
});
