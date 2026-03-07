import { getPlainTextFromHtml, type TFile } from '@sharkord/shared';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { getChannelsForUser } from '../../db/queries/channels';
import { getSettings } from '../../db/queries/server';
import { channels, files, messageFiles, messages } from '../../db/schema';
import { generateFileToken } from '../../helpers/files-crypto';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

// this search is pretty basic and it CAN be optimized, however it might not be worth it
// some things things we can do:
// check https://sqlite.org/fts5.html for full text search capabilities, but it might be an overkill and add complexity to the codebase
// save an already pre-processed plain text version of the message content in the database to avoid having to do it in JS and speed up the search (this would require updating the existing messages and keeping it in sync for new messages, but it would make the search much faster and more accurate)
// for files the same applies, we could save a pre-processed version of the original name in lowercase to speed up the search and make it more accurate
// however, the quick test I did with close to 10k messages the request was taking around 4-8 ms, which is more than good enough

const SEARCH_QUERY_MIN_LENGTH = 2; // minimum length for search query to prevent too broad searches
const SEARCH_QUERY_MAX_LENGTH = 24; // maximum length for search query to prevent performance issues and potential abuse
const MESSAGE_FETCH_MULTIPLIER = 4; // multiplier to fetch more messages than requested to account for filtering after fetching from the database
const MAX_MESSAGE_FETCH_LIMIT = 100; // absolute maximum number of messages to fetch from the database before filtering, to prevent performance issues

const MESSAGES_LIMIT = 25;
const FILES_LIMIT = 25;

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, '\\$&');

const searchMessagesRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.search.maxRequests,
  windowMs: config.rateLimiters.search.windowMs,
  logLabel: 'search'
})
  .input(
    z.object({
      query: z
        .string()
        .trim()
        .toLowerCase()
        .min(SEARCH_QUERY_MIN_LENGTH)
        .max(SEARCH_QUERY_MAX_LENGTH)
    })
  )
  .query(async ({ ctx, input }) => {
    const settings = await getSettings();

    invariant(settings.enableSearch, 'Search is disabled on this server');

    const accessibleChannels = await getChannelsForUser(ctx.userId);

    const accessibleChannelIds = accessibleChannels
      .filter((channel) => !channel.isDm)
      .map((channel) => channel.id);

    if (accessibleChannelIds.length === 0) {
      return {
        messages: [],
        files: []
      };
    }

    const likePattern = `%${escapeLikePattern(input.query)}%`;
    const messageFetchLimit = Math.min(
      MESSAGES_LIMIT * MESSAGE_FETCH_MULTIPLIER,
      MAX_MESSAGE_FETCH_LIMIT
    );

    const [messageRows, fileRows] = await Promise.all([
      db
        .select({
          message: messages,
          channelName: channels.name,
          channelIsDm: channels.isDm,
          channelPrivate: channels.private,
          channelFileAccessToken: channels.fileAccessToken
        })
        .from(messages)
        .innerJoin(channels, eq(channels.id, messages.channelId))
        .where(
          and(
            inArray(messages.channelId, accessibleChannelIds),
            sql`lower(coalesce(${messages.content}, '')) LIKE ${likePattern} ESCAPE '\\'`
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(messageFetchLimit),
      db
        .select({
          file: files,
          messageId: messages.id,
          channelId: messages.channelId,
          messageContent: messages.content,
          messageCreatedAt: messages.createdAt,
          channelName: channels.name,
          channelIsDm: channels.isDm,
          channelPrivate: channels.private,
          channelFileAccessToken: channels.fileAccessToken
        })
        .from(messageFiles)
        .innerJoin(files, eq(files.id, messageFiles.fileId))
        .innerJoin(messages, eq(messages.id, messageFiles.messageId))
        .innerJoin(channels, eq(channels.id, messages.channelId))
        .where(
          and(
            inArray(messages.channelId, accessibleChannelIds),
            sql`lower(${files.originalName}) LIKE ${likePattern} ESCAPE '\\'`
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(FILES_LIMIT)
    ]);

    const matchedMessages = messageRows
      .map((row) => {
        const plainContent = getPlainTextFromHtml(
          row.message.content ?? ''
        ).trim();

        return {
          ...row,
          plainContent
        };
      })
      .filter((row) => {
        if (!row.plainContent) {
          return false;
        }

        return row.plainContent.toLowerCase().includes(input.query);
      })
      .slice(0, MESSAGES_LIMIT);

    const matchedMessageIds = matchedMessages.map((row) => row.message.id);

    const attachedFileRows =
      matchedMessageIds.length > 0
        ? await db
            .select({
              messageId: messageFiles.messageId,
              file: files
            })
            .from(messageFiles)
            .innerJoin(files, eq(files.id, messageFiles.fileId))
            .where(inArray(messageFiles.messageId, matchedMessageIds))
        : [];

    const filesByMessageId = new Map<number, TFile[]>();

    for (const row of attachedFileRows) {
      const list = filesByMessageId.get(row.messageId) ?? [];

      list.push({ ...row.file });
      filesByMessageId.set(row.messageId, list);
    }

    const matchedMessagesWithFiles = matchedMessages.map((row) => {
      const messageFiles = filesByMessageId.get(row.message.id) ?? [];

      const preparedFiles = messageFiles.map((file) => {
        if (!row.channelPrivate) {
          return file;
        }

        return {
          ...file,
          _accessToken: generateFileToken(file.id, row.channelFileAccessToken)
        };
      });

      return {
        ...row.message,
        channelName: row.channelName,
        channelIsDm: row.channelIsDm,
        plainContent: row.plainContent,
        files: preparedFiles,
        reactions: []
      };
    });

    const matchedFiles = fileRows.map((row) => {
      const file: TFile = { ...row.file };

      if (row.channelPrivate) {
        file._accessToken = generateFileToken(
          file.id,
          row.channelFileAccessToken
        );
      }

      return {
        file,
        messageId: row.messageId,
        channelId: row.channelId,
        messageContent: row.messageContent,
        messageCreatedAt: row.messageCreatedAt,
        channelName: row.channelName,
        channelIsDm: row.channelIsDm
      };
    });

    return {
      messages: matchedMessagesWithFiles,
      files: matchedFiles
    };
  });

export { searchMessagesRoute };
