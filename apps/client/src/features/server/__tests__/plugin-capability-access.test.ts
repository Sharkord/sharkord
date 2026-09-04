import type { IRootState } from '@/features/store';
import {
  OWNER_ROLE_ID,
  PluginCapabilityType,
  type TPluginCapabilityAccessRule
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { canUsePluginCapabilitySelector } from '../selectors';

const MEMBER_ROLE = 2;
const MODERATOR_ROLE = 9;

const stateWith = (
  rules: TPluginCapabilityAccessRule[],
  roleIds: number[] = [MEMBER_ROLE]
) =>
  ({
    server: {
      pluginCapabilityAccess: rules,
      ownUserId: 1,
      users: [{ id: 1, roleIds }],
      roles: [
        { id: MEMBER_ROLE },
        { id: MODERATOR_ROLE },
        { id: OWNER_ROLE_ID }
      ]
    }
  }) as unknown as IRootState;

const canUsePlayMusic = (state: IRootState) =>
  canUsePluginCapabilitySelector(
    state,
    'plugin-a',
    PluginCapabilityType.ACTION,
    'playMusic'
  );

const restrictedTo = (roleIds: number[]): TPluginCapabilityAccessRule => ({
  pluginId: 'plugin-a',
  type: PluginCapabilityType.ACTION,
  name: 'playMusic',
  roleIds
});

describe('canUsePluginCapabilitySelector', () => {
  test('should allow a capability no rule mentions', () => {
    expect(canUsePlayMusic(stateWith([]))).toBe(true);
  });

  test('should allow a role the rule grants', () => {
    expect(canUsePlayMusic(stateWith([restrictedTo([MEMBER_ROLE])]))).toBe(
      true
    );
  });

  test('should refuse a role the rule leaves out', () => {
    expect(canUsePlayMusic(stateWith([restrictedTo([MODERATOR_ROLE])]))).toBe(
      false
    );
  });

  // a restriction granting nobody is how an admin turns a capability off
  test('should refuse a rule that grants no role', () => {
    expect(canUsePlayMusic(stateWith([restrictedTo([])]))).toBe(false);
  });

  test('should never refuse the owner', () => {
    expect(
      canUsePlayMusic(stateWith([restrictedTo([])], [OWNER_ROLE_ID]))
    ).toBe(true);
  });

  test('should not answer for the command of the same name', () => {
    const state = stateWith([restrictedTo([MODERATOR_ROLE])]);

    expect(
      canUsePluginCapabilitySelector(
        state,
        'plugin-a',
        PluginCapabilityType.COMMAND,
        'playMusic'
      )
    ).toBe(true);
  });

  test('should not answer for another plugin', () => {
    const state = stateWith([restrictedTo([MODERATOR_ROLE])]);

    expect(
      canUsePluginCapabilitySelector(
        state,
        'plugin-b',
        PluginCapabilityType.ACTION,
        'playMusic'
      )
    ).toBe(true);
  });
});
