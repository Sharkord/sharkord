import type { PluginCapabilityMode, TPluginCapability } from '@sharkord/shared';

export const EVERYONE_KEY = 'everyone';

export type TCapabilityAccessEntry = {
  mode: PluginCapabilityMode;
  roleIds: number[];
  configured: boolean; // false means the plugin's own default still applies and no row is stored
};

export type TCapabilityAccessMap = Record<string, TCapabilityAccessEntry>;

export const capabilityKey = (type: string, name: string) => `${type}:${name}`;

export const toEntry = (
  access: TPluginCapability['defaultAccess'],
  configured: boolean
): TCapabilityAccessEntry => ({
  mode: access.mode,
  roleIds: [...access.roleIds].sort((a, b) => a - b),
  configured
});
