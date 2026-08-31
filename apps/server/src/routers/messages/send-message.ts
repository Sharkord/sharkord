import {
  ActivityLogType,
  ChannelPermission,
  FileSaveType,
  getErrorMessage,
  getPlainTextFromHtml,
  isEmptyMessage,
  MESSAGE_MAX_LENGTH,
  MessageSaveType,
  Permission,
  STORAGE_MAX_FILES_PER_MESSAGE,
  toDomCommand
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { publishMessage, publishReplyCount } from '../../db/publishers';
import { assertDmChannel } from '../../db/queries/dms';
import { getSettings } from '../../db/queries/server';
import { messageFiles, messages } from '../../db/schema';
import { fileManager } from '../../helpers/file-manager';
import { getInvokerCtxFromTrpcCtx } from '../../helpers/get-invoker-ctx-from-trpc-ctx';
import { parseCommandArgs } from '../../helpers/parse-command-args';
import { runBeforeMessageSaveHooks } from '../../helpers/run-before-message-save-hooks';
import { sanitizeMessageHtml } from '../../helpers/sanitize-html';
import { logger } from '../../logger';
import { pluginManager } from '../../plugins';
import { eventBus } from '../../plugins/event-bus';
import { enqueueActivityLog } from '../../queues/activity-log';
import { enqueueProcessMetadata } from '../../queues/message-metadata';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const sendMessageRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.sendAndEditMessage.maxRequests,
  windowMs: config.rateLimiters.sendAndEditMessage.windowMs,
  logLabel: 'sendMessage'
})
  .input(
    z.object({
      content: z.string().max(MESSAGE_MAX_LENGTH),
      channelId: z.number(),
      files: z.array(z.string()).max(STORAGE_MAX_FILES_PER_MESSAGE).default([]),
      parentMessageId: z.number().optional(),
      replyToMessageId: z.number().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await Promise.all([
      ctx.needsPermission(Permission.SEND_MESSAGES),
      ctx.needsChannelPermission(
        input.channelId,
        ChannelPermission.SEND_MESSAGES
      )
    ]);

    if (input.parentMessageId) {
      const parentMessage = await db
        .select({
          id: messages.id,
          channelId: messages.channelId,
          parentMessageId: messages.parentMessageId
        })
        .from(messages)
        .where(eq(messages.id, input.parentMessageId))
        .limit(1)
        .get();

      invariant(parentMessage, {
        code: 'NOT_FOUND',
        message: 'Parent message not found.'
      });

      invariant(parentMessage.channelId === input.channelId, {
        code: 'BAD_REQUEST',
        message: 'Parent message must be in the same channel.'
      });

      invariant(!parentMessage.parentMessageId, {
        code: 'BAD_REQUEST',
        message:
          'Cannot reply to a thread reply. Threads are only one level deep.'
      });
    }

    if (input.replyToMessageId) {
      const repliedMessage = await db
        .select({
          id: messages.id,
          channelId: messages.channelId
        })
        .from(messages)
        .where(eq(messages.id, input.replyToMessageId))
        .limit(1)
        .get();

      invariant(repliedMessage, {
        code: 'NOT_FOUND',
        message: 'Reply target message not found.'
      });

      invariant(repliedMessage.channelId === input.channelId, {
        code: 'BAD_REQUEST',
        message: 'Reply target message must be in the same channel.'
      });
    }

    // assertDmChannel already had to resolve whether this is a DM, so it hands
    // the answer back rather than the route asking for the same row again
    const [settings, isDmChannel] = await Promise.all([
      getSettings(),
      assertDmChannel(input.channelId, ctx.userId)
    ]);

    const { storageMaxFilesPerMessage, enablePlugins } = settings;

    invariant(input.files.length <= Math.max(0, storageMaxFilesPerMessage), {
      code: 'BAD_REQUEST',
      message: `You can attach at most ${storageMaxFilesPerMessage} file(s) per message.`
    });

    const limitedFiles = input.files;

    if (limitedFiles.length > 0) {
      await ctx.needsPermission(Permission.UPLOAD_FILES);

      invariant(settings.storageUploadEnabled, {
        code: 'FORBIDDEN',
        message: 'File uploads are disabled on this server'
      });

      if (isDmChannel) {
        invariant(settings.storageFileSharingInDirectMessages, {
          code: 'FORBIDDEN',
          message: 'File sharing in direct messages is disabled on this server'
        });
      }
    }

    invariant(!isEmptyMessage(input.content) || limitedFiles.length != 0, {
      code: 'BAD_REQUEST',
      message: 'Message cannot be empty.'
    });

    let targetContent = sanitizeMessageHtml(input.content);

    invariant(!isEmptyMessage(targetContent) || limitedFiles.length != 0, {
      code: 'BAD_REQUEST',
      message:
        'Your message only contained unsupported or removed content, so there was nothing to send.'
    });

    if (enablePlugins) {
      targetContent = await runBeforeMessageSaveHooks({
        content: targetContent,
        channelId: input.channelId,
        userId: ctx.userId,
        type: MessageSaveType.CREATE
      });
    }

    let editable = true;
    let commandExecutor: ((messageId: number) => void) | undefined = undefined;

    // derived from the sanitized html, not the raw input: otherwise the command
    // that runs, and the text plugins receive, can differ from what is stored
    // and shown to everyone else
    const plainText = getPlainTextFromHtml(targetContent);

    if (enablePlugins) {
      // when plugins are enabled, need to check if the message is a command
      // this might be improved in the future with a more robust parser
      const { args, commandName } = parseCommandArgs(plainText);
      const foundCommand = pluginManager.getCommandByName(commandName);

      if (foundCommand) {
        if (await ctx.hasPermission(Permission.USE_PLUGINS)) {
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

          const pluginLogo = pluginManager.getPluginLogo(foundCommand.pluginId);

          editable = false;
          targetContent = toDomCommand(
            { ...foundCommand, imageUrl: pluginLogo, status: 'pending' },
            args
          );

          // do not await, let it run in background
          commandExecutor = (messageId: number) => {
            const updateCommandStatus = async (
              status: 'completed' | 'failed',
              response?: unknown
            ) => {
              const updatedContent = toDomCommand(
                {
                  ...foundCommand,
                  imageUrl: pluginLogo,
                  response,
                  status
                },
                args
              );

              // awaited before publishing, otherwise clients are told to
              // refetch a message whose new content has not been written yet
              await db
                .update(messages)
                .set({ content: updatedContent })
                .where(eq(messages.id, messageId));

              publishMessage(messageId, input.channelId, 'update');
            };

            pluginManager
              .executeCommand(
                foundCommand.pluginId,
                foundCommand.name,
                getInvokerCtxFromTrpcCtx(ctx),
                argsObject
              )
              .then((response) => updateCommandStatus('completed', response))
              .catch((error) =>
                updateCommandStatus('failed', error?.message || 'Unknown error')
              )
              // the handler above is what writes the status, so a failure in it is the end
              // of the line: there is nothing further to fall back to and no request left
              // to answer
              .catch((error) =>
                logger.error(
                  'Failed to record the status of command %s: %s',
                  foundCommand.name,
                  getErrorMessage(error)
                )
              )
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

    const savedFileIds: number[] = [];

    for (const tempFileId of limitedFiles) {
      const newFile = await fileManager.saveFile(
        tempFileId,
        ctx.userId,
        FileSaveType.MESSAGE
      );

      savedFileIds.push(newFile.id);
    }

    const message = db.transaction((tx) => {
      const createdMessage = tx
        .insert(messages)
        .values({
          channelId: input.channelId,
          userId: ctx.userId,
          content: targetContent,
          editable,
          parentMessageId: input.parentMessageId ?? null,
          replyToMessageId: input.replyToMessageId ?? null,
          createdAt: Date.now()
        })
        .returning()
        .get();

      if (savedFileIds.length > 0) {
        tx.insert(messageFiles)
          .values(
            savedFileIds.map((fileId) => ({
              messageId: createdMessage.id,
              fileId,
              createdAt: Date.now()
            }))
          )
          .run();
      }

      return createdMessage;
    });

    commandExecutor?.(message.id);

    publishMessage(message.id, input.channelId, 'create');

    if (input.parentMessageId) {
      publishReplyCount(input.parentMessageId, input.channelId);
    }

    enqueueProcessMetadata(targetContent, message.id);

    eventBus.emit('message:created', {
      messageId: message.id,
      channelId: input.channelId,
      userId: ctx.userId,
      pluginId: null,
      content: targetContent,
      textContent: plainText
    });

    return message.id;
  });

export { sendMessageRoute };
