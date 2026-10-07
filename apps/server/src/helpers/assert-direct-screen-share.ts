import { ChannelPermission, Permission } from '@sharkord/shared';
import { channelUserCan } from '../db/queries/channels';
import { userCan } from '../db/queries/roles';
import { VoiceRuntime } from '../runtimes/voice';
import { invariant } from '../utils/invariant';

const assertDirectScreenShareParticipant = (
  runtime: VoiceRuntime,
  userId: number
) => {
  const user = runtime.getUser(userId);

  invariant(user, {
    code: 'BAD_REQUEST',
    message: 'User is not in this voice channel'
  });

  return user;
};

const assertDirectScreenSharePair = (
  runtime: VoiceRuntime,
  sharerId: number,
  receiverId: number
) => {
  const sharer = assertDirectScreenShareParticipant(runtime, sharerId);
  const receiver = assertDirectScreenShareParticipant(runtime, receiverId);

  invariant(
    sharer.state.supportsDirectScreenShare &&
      receiver.state.supportsDirectScreenShare,
    {
      code: 'BAD_REQUEST',
      message: 'Both participants must support direct screen sharing'
    }
  );

  return { sharer, receiver };
};

const assertDirectScreenSharePermission = async (
  channelId: number,
  userId: number
) => {
  invariant(await userCan(userId, Permission.SHARE_SCREEN), {
    code: 'FORBIDDEN',
    message: 'Insufficient permissions'
  });

  invariant(
    await channelUserCan(channelId, userId, ChannelPermission.SHARE_SCREEN),
    {
      code: 'FORBIDDEN',
      message: 'Insufficient channel permissions'
    }
  );
};

export {
  assertDirectScreenSharePair,
  assertDirectScreenShareParticipant,
  assertDirectScreenSharePermission
};
