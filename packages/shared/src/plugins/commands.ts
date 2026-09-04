import z from 'zod';
import type { TLocale } from '../statics/locales';
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

/** Where an invocation came from, since a command can arrive both ways. */
export type TInvokerSource = 'chat' | 'api';

/**
 * Who ran a command or action, and where they were when they did.
 *
 * Every id here is one the host proved the caller can reach, so it is safe to
 * write to. `locale` is the exception: it is what the client said it is using,
 * which is worth nothing more than the language of a reply.
 */
export type TInvokerContext = {
  userId: number;
  /**
   * `chat` when the user typed the command into a channel, where the answer
   * renders as a public chip; `api` when a plugin's own UI called it and the
   * answer goes back to that caller alone.
   */
  source: TInvokerSource;
  /**
   * The channel the invocation came from: where the command was typed, or what
   * the caller had open. Absent when the caller had no channel open.
   */
  channelId?: number;
  /**
   * The thread the command was typed in, when it was. Answer with this as
   * `parentMessageId` or the reply lands in the channel instead of the thread.
   */
  parentMessageId?: number;
  /** the command's own message, for replying to it. chat invocations only */
  messageId?: number;
  /** the voice channel they are connected to, if any */
  currentVoiceChannelId?: number;
  /**
   * The language the client is showing, for plugins that answer in text. Read
   * when the session started, so a user who switches language mid session is
   * still reported as the language they joined with.
   */
  locale: TLocale;
};

/**
 * A slash command. Users type `/name` in chat, and both the invocation and what
 * `executes` returns render as a chip in the channel, so the answer is public.
 *
 * ```ts
 * ctx.commands.register({
 *   name: 'roll',
 *   description: 'Roll a die',
 *   args: [{ name: 'sides', type: 'number', required: true }],
 *   requires: Permission.SEND_MESSAGES,
 *   async executes(invoker, args) {
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
  executes(ctx: TInvokerContext, args: TArgs): Promise<unknown>;
}

export interface ActionDefinition<TPayload = void> {
  name: string;
  description?: string;
  requires?: Permission;
  executes: (ctx: TInvokerContext, payload: TPayload) => Promise<unknown>;
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
