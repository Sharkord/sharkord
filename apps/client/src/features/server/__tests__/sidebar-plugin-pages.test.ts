import type { IRootState } from '@/features/store';
import {
  OWNER_ROLE_ID,
  Permission,
  PluginCapabilityType,
  PluginSlot,
  type TPluginCapabilityAccessRule,
  type TPluginComponentsMap,
  type TPluginPagesMap
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { pluginSlotIdsSelector } from '../plugins/selectors';
import { sidebarPluginPagesSelector } from '../selectors';

const Component = () => null;

type TStateOptions = {
  components?: TPluginComponentsMap;
  pages?: TPluginPagesMap;
  access?: TPluginCapabilityAccessRule[];
  roleIds?: number[];
};

const stateWith = ({
  components = {},
  pages = {},
  access = [],
  roleIds = [2]
}: TStateOptions) =>
  ({
    server: {
      pluginComponents: components,
      pluginPages: pages,
      pluginCapabilityAccess: access,
      ownUserId: 1,
      users: [{ id: 1, roleIds }],
      roles: [
        { id: 2, permissions: [Permission.USE_PLUGINS] },
        { id: 3, permissions: [Permission.SEND_MESSAGES] },
        { id: 9, permissions: [Permission.USE_PLUGINS] },
        { id: OWNER_ROLE_ID, permissions: [] }
      ]
    }
  }) as unknown as IRootState;

const twoPages: TPluginPagesMap = {
  'plugin-a': [
    { id: 'supporters', label: 'Supporters <3', component: Component },
    { id: 'stats', label: 'Stats', component: Component }
  ]
};

describe('sidebarPluginPagesSelector', () => {
  test('should list one button per page, with its own label', () => {
    const pages = sidebarPluginPagesSelector(stateWith({ pages: twoPages }));

    expect(pages).toEqual([
      { pluginId: 'plugin-a', pageId: 'supporters', label: 'Supporters <3' },
      { pluginId: 'plugin-a', pageId: 'stats', label: 'Stats' }
    ]);
  });

  // plugins written before pages existed keep their single button
  test('should list a FULL_SCREEN slot as one button labelled with the id', () => {
    const pages = sidebarPluginPagesSelector(
      stateWith({
        components: { 'plugin-b': { [PluginSlot.FULL_SCREEN]: [Component] } }
      })
    );

    expect(pages).toEqual([{ pluginId: 'plugin-b', label: 'plugin-b' }]);
  });

  test('should list nothing for a user without USE_PLUGINS', () => {
    const pages = sidebarPluginPagesSelector(
      stateWith({
        pages: twoPages,
        components: { 'plugin-b': { [PluginSlot.FULL_SCREEN]: [Component] } },
        roleIds: [3]
      })
    );

    expect(pages).toEqual([]);
  });

  test('should list pages for the owner, who holds every permission', () => {
    const pages = sidebarPluginPagesSelector(
      stateWith({ pages: twoPages, roleIds: [OWNER_ROLE_ID] })
    );

    expect(pages).toHaveLength(2);
  });

  test('should drop every page of a plugin whose FULL_SCREEN is restricted away', () => {
    const pages = sidebarPluginPagesSelector(
      stateWith({
        pages: twoPages,
        components: { 'plugin-a': { [PluginSlot.FULL_SCREEN]: [Component] } },
        access: [
          {
            pluginId: 'plugin-a',
            type: PluginCapabilityType.COMPONENT,
            name: PluginSlot.FULL_SCREEN,
            roleIds: [9]
          }
        ]
      })
    );

    expect(pages).toEqual([]);
  });
});

describe('pluginSlotIdsSelector', () => {
  // the admin restricts pages through the FULL_SCREEN slot, so a plugin with
  // pages and no FULL_SCREEN component still needs it listed
  test('should list FULL_SCREEN for a plugin that only has pages', () => {
    const slots = pluginSlotIdsSelector(
      stateWith({
        pages: twoPages,
        components: { 'plugin-a': { [PluginSlot.HOME_SCREEN]: [Component] } }
      }),
      'plugin-a'
    );

    expect(slots).toEqual([PluginSlot.HOME_SCREEN, PluginSlot.FULL_SCREEN]);
  });
});
