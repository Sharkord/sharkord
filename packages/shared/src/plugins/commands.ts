import z from 'zod';
import type { Permission } from '../statics/permissions';
import { zHttpUrl, zPluginId } from './primitives';

/** One argument of a slash command, rendered as a field in the command chip. */
export type TCommandArg = {
  name: string;
  description?: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  /**
   * Masks the value in the rendered chip and keeps it out of the plugin log.
   * For passwords and tokens. It hides the value from onlookers, not from the
   * server.
   */
  sensitive?: boolean;
};

/** Who ran a command or action, and where they were when they did. */
export type TInvokerContext = {
  userId: number;
  /** the voice channel they are connected to, if any */
  currentVoiceChannelId?: number;
};

export type TCommandContract = Record<
  string,
  { args: unknown; response: unknown }
>;

/**
 * A slash command. Users type `/name` in chat, and both the invocation and what
 * `execute` returns render as a chip in the channel, so the answer is public.
 *
 * ```ts
 * ctx.commands.register({
 *   name: 'roll',
 *   description: 'Roll a die',
 *   args: [{ name: 'sides', type: 'number', required: true }],
 *   requires: Permission.SEND_MESSAGES,
 *   async execute(invoker, args) {
 *     return { message: `${1 + Math.floor(Math.random() * args.sides)}` };
 *   }
 * });
 * ```
 */
export interface CommandDefinition<TArgs = void> {
  /** what users type after the slash. two plugins cannot share one */
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
