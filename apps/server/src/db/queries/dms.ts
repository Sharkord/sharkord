import type { TDirectMessageConversation } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { and, eq, inArray, max, or } from 'drizzle-orm';
import { db } from '..';
import { channels, directMessages, messages } from '../schema';
import { getChannelsReadStatesForUser } from './channels';

const normalizePair = (a: number, b: number): [number, number] =>
  a < b ? [a, b] : [b, a];

// returns the DM channel between the two users
const getDirectMessageChannel = async (
  userOneId: number,
  userTwoId: number
) => {
  const [a, b] = normalizePair(userOneId, userTwoId);

  return db
    .select()
    .from(directMessages)
    .where(
      and(eq(directMessages.userOneId, a), eq(directMessages.userTwoId, b))
    )
    .limit(1)
    .get();
};

// returns all DM channel IDs the user is a participant in
const getDirectMessageChannelIdsForUser = async (
  userId: number
): Promise<number[]> => {
  const rows = await db
    .select({
      channelId: directMessages.channelId
    })
    .from(directMessages)
    .where(
      or(
        eq(directMessages.userOneId, userId),
        eq(directMessages.userTwoId, userId)
      )
    );

  return rows.map((row) => row.channelId);
};

// returns all DM channels the user is a participant in along with metadata
const getDirectMessageConversations = async (
  userId: number
): Promise<TDirectMessageConversation[]> => {
  const rows = await db
    .select()
    .from(directMessages)
    .where(
      or(
        eq(directMessages.userOneId, userId),
        eq(directMessages.userTwoId, userId)
      )
    );

  if (rows.length === 0) {
    return [];
  }

  const channelIds = rows.map((row) => row.channelId);

  const [lastMessageRows, unreadMapRaw] = await Promise.all([
    db
      .select({
        channelId: messages.channelId,
        lastMessageAt: max(messages.createdAt)
      })
      .from(messages)
      .where(inArray(messages.channelId, channelIds))
      .groupBy(messages.channelId),
    getChannelsReadStatesForUser(userId)
  ]);

  const lastMessageMap = new Map<number, number>();

  for (const row of lastMessageRows) {
    lastMessageMap.set(row.channelId, row.lastMessageAt ?? 0);
  }

  const conversations = rows.map((row) => {
    const otherUserId =
      row.userOneId === userId ? row.userTwoId : row.userOneId;
    const lastMessageAt = lastMessageMap.get(row.channelId) ?? row.createdAt;

    return {
      channelId: row.channelId,
      userId: otherUserId,
      unreadCount: unreadMapRaw[row.channelId] ?? 0,
      lastMessageAt
    };
  });

  conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

  return conversations;
};

// checks if a channel is a DM channel by looking for it in the directMessages table
const isDirectMessageChannel = async (channelId: number): Promise<boolean> => {
  const channel = await db
    .select({ isDm: channels.isDm })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1)
    .get();

  return !!channel?.isDm;
};

// checks if the user is a participant in the DM channel by looking for a matching row in the directMessages table
const isUserDmParticipant = async (
  channelId: number,
  userId: number
): Promise<boolean> => {
  const dm = await db
    .select({ channelId: directMessages.channelId })
    .from(directMessages)
    .where(
      and(
        eq(directMessages.channelId, channelId),
        or(
          eq(directMessages.userOneId, userId),
          eq(directMessages.userTwoId, userId)
        )
      )
    )
    .limit(1)
    .get();

  return !!dm;
};

// check if the user is a participant in the DM channel, throw if not
const assertDmParticipant = async (
  channelId: number,
  userId: number
): Promise<void> => {
  const isDm = await isDirectMessageChannel(channelId);

  if (!isDm) return;

  const isParticipant = await isUserDmParticipant(channelId, userId);

  if (!isParticipant) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not a participant in this DM channel'
    });
  }
};

// checks if a channel is a DM channel by looking for it in the directMessages table
// TODO: this should not be needed since we have channel.isDm
const isChannelDm = async (channelId: number): Promise<boolean> => {
  const channel = await db
    .select({ isDm: channels.isDm })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1)
    .get();

  return !!channel?.isDm;
};

const isMessageFromDmChannel = async (messageId: number): Promise<boolean> => {
  const message = await db
    .select({ channelId: messages.channelId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)
    .get();

  if (!message) return false;

  return isChannelDm(message.channelId);
};

export {
  assertDmParticipant,
  getDirectMessageChannel,
  getDirectMessageChannelIdsForUser,
  getDirectMessageConversations,
  isChannelDm,
  isDirectMessageChannel,
  isMessageFromDmChannel,
  isUserDmParticipant,
  normalizePair
};
