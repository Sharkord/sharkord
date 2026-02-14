import {
  ActivityLogType,
  ChannelPermission,
  Permission,
  toDomCommand,
  isEmptyMessage
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { messageFiles, messages } from '../../db/schema';
import { getInvokerCtxFromTrpcCtx } from '../../helpers/get-invoker-ctx-from-trpc-ctx';
import { getPlainTextFromHtml } from '../../helpers/get-plain-text-from-html';
import { parseCommandArgs } from '../../helpers/parse-command-args';
import { sanitizeMessageHtml } from '../../helpers/sanitize-html';
import { pluginManager } from '../../plugins';
import { eventBus } from '../../plugins/event-bus';
import { enqueueActivityLog } from '../../queues/activity-log';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { fileManager } from '../../utils/file-manager';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const sendMessageRoute = protectedProcedure
  .input(
    z
      .object({
        content: z.string(),
        channelId: z.number(),
        files: z.array(z.string()).optional()
      })
      .required()
  )
  .mutation(async ({ input, ctx }) => {
    await Promise.all([
      ctx.needsPermission(Permission.SEND_MESSAGES),
      ctx.needsChannelPermission(
        input.channelId,
        ChannelPermission.SEND_MESSAGES
      )
    ]);

    invariant(!isEmptyMessage(input.content) || input.files.length != 0, {
      code: 'BAD_REQUEST',
      message: 'Message cannot be empty.'
    });

    let targetContent = sanitizeMessageHtml(input.content);

    invariant(!isEmptyMessage(input.content) || input.files.length != 0, {
      code: 'BAD_REQUEST',
      message: 'Your message only contained unsupported or removed content, so there was nothing to send.'
    });

    let editable = true;
    let commandExecutor: ((messageId: number) => void) | undefined = undefined;

    const { enablePlugins } = await getSettings();

    if (enablePlugins) {
      // when plugins are enabled, need to check if the message is a command
      // this might be improved in the future with a more robust parser
      const plainText = getPlainTextFromHtml(input.content);
      const { args, commandName } = parseCommandArgs(plainText);
      const foundCommand = pluginManager.getCommandByName(commandName);

      if (foundCommand) {
        if (await ctx.hasPermission(Permission.EXECUTE_PLUGIN_COMMANDS)) {
          const argsObject: Record<string, unknown> = {};

          if (foundCommand.args) {
            foundCommand.args.forEach((argDef, index) => {
              if (index < args.length) {
                const value = args[index];

                if (argDef.type === 'number') {
                  argsObject[argDef.name] = Number(value);
                } else if (argDef.type === 'boolean') {
                  argsObject[argDef.name] = value === 'true';
                } else {
                  argsObject[argDef.name] = value;
                }
              }
            });
          }

          const plugin = await pluginManager.getPluginInfo(
            foundCommand?.pluginId || ''
          );

          editable = false;
          targetContent = toDomCommand(
            { ...foundCommand, imageUrl: plugin?.logo, status: 'pending' },
            args
          );

          // do not await, let it run in background
          commandExecutor = (messageId: number) => {
            const updateCommandStatus = (
              status: 'completed' | 'failed',
              response?: unknown
            ) => {
              const updatedContent = toDomCommand(
                {
                  ...foundCommand,
                  imageUrl: plugin?.logo,
                  response,
                  status
                },
                args
              );

              db.update(messages)
                .set({ content: updatedContent })
                .where(eq(messages.id, messageId))
                .execute();

              publishMessage(messageId, input.channelId, 'update');
            };

            pluginManager
              .executeCommand(
                foundCommand.pluginId,
                foundCommand.name,
                getInvokerCtxFromTrpcCtx(ctx),
                argsObject
              )
              .then((response) => {
                updateCommandStatus('completed', response);
              })
              .catch((error) => {
                updateCommandStatus(
                  'failed',
                  error?.message || 'Unknown error'
                );
              })
              .finally(() => {
                enqueueActivityLog({
                  type: ActivityLogType.EXECUTED_PLUGIN_COMMAND,
                  userId: ctx.user.id,
                  details: {
                    pluginId: foundCommand.pluginId,
                    commandName: foundCommand.name,
                    args: argsObject
                  }
                });
              });
          };
        }
      }
    }

    const message = await db
      .insert(messages)
      .values({
        channelId: input.channelId,
        userId: ctx.userId,
        content: targetContent,
        editable,
        createdAt: Date.now()
      })
      .returning()
      .get();

    commandExecutor?.(message.id);

    if (input.files.length > 0) {
      for (const tempFileId of input.files) {
        const newFile = await fileManager.saveFile(tempFileId, ctx.userId);

        await db.insert(messageFiles).values({
          messageId: message.id,
          fileId: newFile.id,
          createdAt: Date.now()
        });
      }
    }

    publishMessage(message.id, input.channelId, 'create');
    enqueueProcessMetadata(targetContent, message.id);

    eventBus.emit('message:created', {
      messageId: message.id,
      channelId: input.channelId,
      userId: ctx.userId,
      content: targetContent
    });

    return message.id;
  });

export { sendMessageRoute };
