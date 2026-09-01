import z from 'zod';
import type { Permission } from '../statics/permissions';
import { zHttpUrl, zPluginId } from './primitives';

export type TCommandArg = {
  name: string;
  description?: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  sensitive?: boolean;
};

export type TInvokerContext = {
  userId: number;
  currentVoiceChannelId?: number;
};

export type TCommandContract = Record<
  string,
  { args: unknown; response: unknown }
>;

export interface CommandDefinition<TArgs = void> {
  name: string;
  description?: string;
  args?: TCommandArg[];
  requires?: Permission;
  execute(ctx: TInvokerContext, args: TArgs): Promise<unknown>;
}

export interface ActionDefinition<TPayload = void> {
  name: string;
  description?: string;
  requires?: Permission;
  execute: (ctx: TInvokerContext, payload: TPayload) => Promise<unknown>;
}

export type TCommandInfo = {
  pluginId: string;
  name: string;
  description?: string;
  args?: CommandDefinition<unknown>['args'];
};

export type TCommandsMapByPlugin = {
  [pluginId: string]: TCommandInfo[];
};

export type RegisteredCommand = {
  pluginId: string;
  name: string;
  description?: string;
  args?: CommandDefinition<unknown>['args'];
  command: CommandDefinition<unknown>;
};

export type RegisteredAction = {
  pluginId: string;
  name: string;
  description?: string;
  action: ActionDefinition<unknown>;
};

export const zParsedDomCommand = z.object({
  pluginId: zPluginId,
  commandName: z.string().min(1),
  status: z.enum(['pending', 'completed', 'failed']).default('pending'),
  response: z.string().optional(),
  logo: zHttpUrl.optional(),
  args: z.array(
    z.object({
      name: z.string(),
      value: z.unknown()
    })
  )
});

export type TParsedDomCommand = z.infer<typeof zParsedDomCommand>;

export type TCommandElement = {
  attribs: {
    'data-plugin-id'?: string;
    'data-plugin-logo'?: string;
    'data-command'?: string;
    'data-status'?: string;
    'data-args'?: string;
    'data-response'?: string;
  };
};
