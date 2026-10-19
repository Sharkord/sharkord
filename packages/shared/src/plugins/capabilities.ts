import type { Permission } from '../statics/permissions';

export enum PluginCapabilityType {
  COMMAND = 'command',
  ACTION = 'action',
  COMPONENT = 'component',
  HTTP_ROUTE = 'http_route',
  NOTIFICATION = 'notification'
}

export const PLUGIN_NOTIFICATIONS_CAPABILITY = 'notifications';

export enum PluginCapabilityMode {
  PUBLIC = 'public',
  RESTRICTED = 'restricted'
}

export type TPluginCapabilityAccess = {
  mode: PluginCapabilityMode;
  roleIds: number[];
};

export type TPluginCapability = TPluginCapabilityAccess & {
  type: PluginCapabilityType;
  name: string;
  description?: string;
  configured: boolean;
  requires?: Permission;
  defaultAccess: TPluginCapabilityAccess;
};

export type TPluginCapabilityAccessRule = {
  pluginId: string;
  type: PluginCapabilityType;
  name: string;
  roleIds: number[];
};
