import type { IRootState } from '@/features/store';
import {
  OWNER_ROLE_ID,
  PluginSlot,
  type TPluginComponentAccessRule,
  type TPluginComponentsMap,
  type TPluginMetadata
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { userSettingsPluginsSelector } from '../selectors';

const Component = () => null;

const METADATA: TPluginMetadata[] = [
  {
    pluginId: 'plugin-a',
    name: 'Plugin A',
    description: 'first',
    version: '1.0.0',
    avatarUrl: 'https://example.com/a.png'
  }
];

type TStateOptions = {
  components?: TPluginComponentsMap;
  access?: TPluginComponentAccessRule[];
  roleIds?: number[];
};

const stateWith = ({
  components = {},
  access = [],
  roleIds = [2]
}: TStateOptions) =>
  ({
    server: {
      pluginComponents: components,
      pluginsMetadata: METADATA,
      pluginComponentAccess: access,
      ownUserId: 1,
      users: [{ id: 1, roleIds }],
      roles: [{ id: 2 }, { id: 9 }, { id: OWNER_ROLE_ID }]
    }
  }) as unknown as IRootState;

const withUserSettings: TPluginComponentsMap = {
  'plugin-a': { [PluginSlot.USER_SETTINGS]: [Component] }
};

describe('userSettingsPluginsSelector', () => {
  test('should list a plugin that registered a user settings component', () => {
    const plugins = userSettingsPluginsSelector(
      stateWith({ components: withUserSettings })
    );

    expect(plugins).toEqual([
      {
        pluginId: 'plugin-a',
        name: 'Plugin A',
        logo: 'https://example.com/a.png'
      }
    ]);
  });

  test('should ignore a plugin with components in other slots only', () => {
    const plugins = userSettingsPluginsSelector(
      stateWith({
        components: { 'plugin-a': { [PluginSlot.CHAT_ACTIONS]: [Component] } }
      })
    );

    expect(plugins).toEqual([]);
  });

  // an entry the user may not open would otherwise render as an empty page
  test('should drop a plugin whose component is restricted away', () => {
    const plugins = userSettingsPluginsSelector(
      stateWith({
        components: withUserSettings,
        access: [
          {
            pluginId: 'plugin-a',
            name: PluginSlot.USER_SETTINGS,
            roleIds: [9]
          }
        ]
      })
    );

    expect(plugins).toEqual([]);
  });

  test('should keep a plugin the user has a granted role for', () => {
    const plugins = userSettingsPluginsSelector(
      stateWith({
        components: withUserSettings,
        access: [
          {
            pluginId: 'plugin-a',
            name: PluginSlot.USER_SETTINGS,
            roleIds: [2]
          }
        ]
      })
    );

    expect(plugins).toHaveLength(1);
  });

  test('should never hide an entry from the owner', () => {
    const plugins = userSettingsPluginsSelector(
      stateWith({
        components: withUserSettings,
        access: [
          {
            pluginId: 'plugin-a',
            name: PluginSlot.USER_SETTINGS,
            roleIds: [9]
          }
        ],
        roleIds: [OWNER_ROLE_ID]
      })
    );

    expect(plugins).toHaveLength(1);
  });

  test('should fall back to the plugin id when no metadata arrived', () => {
    const plugins = userSettingsPluginsSelector(
      stateWith({
        components: { 'plugin-b': { [PluginSlot.USER_SETTINGS]: [Component] } }
      })
    );

    expect(plugins[0]).toEqual({
      pluginId: 'plugin-b',
      name: 'plugin-b',
      logo: undefined
    });
  });

  test('should return a stable empty value', () => {
    expect(userSettingsPluginsSelector(stateWith({}))).toBe(
      userSettingsPluginsSelector(stateWith({ components: {} }))
    );
  });
});
