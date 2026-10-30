import type { Permission } from '../statics/permissions';

export enum PluginCapabilityType {
  COMMAND = 'command',
  ACTION = 'action',
  COMPONENT = 'component',
  /** named by method and registered path, e.g. 'GET /hello' */
  HTTP_ROUTE = 'http_route'
}

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
