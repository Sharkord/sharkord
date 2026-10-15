import { ChannelType, Permission, ServerEvents } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import {
  publishHiddenChannelToUser,
  unpublishHiddenChannelFromUser
} from '../db/publishers';
import { userCan } from '../db/queries/roles';
import { getPublicUserById } from '../db/queries/users';
import { channels } from '../db/schema';
import { VoiceRuntime } from '../runtimes/voice';
import { invariant } from '../utils/invariant';
import { pubsub } from '../utils/pubsub';
import { grantVoiceMove } from './voice-move-grants';

const loadVoiceMoveDestination = async (channelId: number) => {
  const channel = await db
    .select({
      id: channels.id,
      name: channels.name,
      type: channels.type,
      isDm: channels.isDm
    })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1)
    .get();

  invariant(channel, {
    code: 'NOT_FOUND',
    message: 'Channel not found'
  });

  invariant(channel.type === ChannelType.VOICE, {
    code: 'BAD_REQUEST',
    message: 'Channel is not a voice channel'
  });

  invariant(!channel.isDm, {
    code: 'BAD_REQUEST',
    message: 'Cannot move a user into a direct message call'
  });

  return channel;
};

const findModeratableVoiceRuntime = async (userId: number) => {
  const runtime = VoiceRuntime.findRuntimeByUserId(userId);

  invariant(runtime, {
    code: 'BAD_REQUEST',
    message: 'User is not in a voice channel'
  });

  const channel = await db
    .select({ isDm: channels.isDm })
    .from(channels)
    .where(eq(channels.id, runtime.id))
    .limit(1)
    .get();

  invariant(!channel?.isDm, {
    code: 'BAD_REQUEST',
    message: 'User is not in a voice channel'
  });

  return runtime;
};

const moveVoiceUser = async (userId: number, channelId: number) => {
  const canUseVoice = await userCan(userId, Permission.JOIN_VOICE_CHANNELS);

  invariant(canUseVoice, {
    code: 'FORBIDDEN',
    message: 'Target user is not allowed to use voice channels'
  });

  const runtime = await findModeratableVoiceRuntime(userId);

  invariant(runtime.id !== channelId, {
    code: 'BAD_REQUEST',
    message: 'User is already in that channel'
  });

  grantVoiceMove(userId, channelId);

  await publishHiddenChannelToUser(userId, channelId);

  pubsub.publishFor(userId, ServerEvents.USER_VOICE_MOVED, {
    channelId,
    fromChannelId: runtime.id
  });
};

const disconnectVoiceUser = async (userId: number) => {
  const runtime = await findModeratableVoiceRuntime(userId);

  runtime.removeUser(userId);

  pubsub.publish(ServerEvents.USER_LEAVE_VOICE, {
    channelId: runtime.id,
    userId
  });

  await unpublishHiddenChannelFromUser(userId, runtime.id);
};

const setVoiceServerMute = async (userId: number, muted: boolean) => {
  const user = await getPublicUserById(userId);

  invariant(user, {
    code: 'NOT_FOUND',
    message: 'User not found'
  });

  VoiceRuntime.setServerMuted(userId, muted);

  const runtime = VoiceRuntime.findRuntimeByUserId(userId);

  if (!runtime) return;

  runtime.syncServerMute(userId);

  pubsub.publish(ServerEvents.USER_VOICE_STATE_UPDATE, {
    channelId: runtime.id,
    userId,
    state: runtime.getUserState(userId)
  });
};

export {
  disconnectVoiceUser,
  loadVoiceMoveDestination,
  moveVoiceUser,
  setVoiceServerMute
};
