import type { Permission } from '../statics/permissions';

export enum PluginCapabilityType {
  COMMAND = 'command',
  ACTION = 'action',
  COMPONENT = 'component'
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
