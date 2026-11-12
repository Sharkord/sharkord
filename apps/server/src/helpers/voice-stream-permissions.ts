import {
  ChannelPermission,
  Permission,
  ServerEvents,
  StreamKind,
  type TProducibleStreamKind
} from '@sharkord/shared';
import { publishVoicePresence } from '../db/publishers';
import { getAffectedUserIdsForChannel } from '../db/queries/channels';
import { getUserIdsWithPermission } from '../db/queries/roles';
import { VoiceRuntime } from '../runtimes/voice';
import { pubsub } from '../utils/pubsub';

const STREAM_KIND_PERMISSIONS: Record<
  TProducibleStreamKind,
  { channel: ChannelPermission; server?: Permission }
> = {
  [StreamKind.AUDIO]: { channel: ChannelPermission.SPEAK },
  [StreamKind.VIDEO]: {
    channel: ChannelPermission.WEBCAM,
    server: Permission.ENABLE_WEBCAM
  },
  [StreamKind.SCREEN]: {
    channel: ChannelPermission.SHARE_SCREEN,
    server: Permission.SHARE_SCREEN
  },
  [StreamKind.SCREEN_AUDIO]: {
    channel: ChannelPermission.SHARE_SCREEN,
    server: Permission.SHARE_SCREEN
  }
};

const REVOCABLE_STREAMS: {
  kinds: TProducibleStreamKind[];
  stateKey: 'webcamEnabled' | 'sharingScreen';
  permissions: (typeof STREAM_KIND_PERMISSIONS)[TProducibleStreamKind];
}[] = [
  {
    kinds: [StreamKind.VIDEO],
    stateKey: 'webcamEnabled',
    permissions: STREAM_KIND_PERMISSIONS[StreamKind.VIDEO]
  },
  {
    kinds: [StreamKind.SCREEN, StreamKind.SCREEN_AUDIO],
    stateKey: 'sharingScreen',
    permissions: STREAM_KIND_PERMISSIONS[StreamKind.SCREEN]
  }
];

const stopRevokedStreamsInRuntime = async (
  runtime: VoiceRuntime,
  { kinds, stateKey, permissions }: (typeof REVOCABLE_STREAMS)[number]
) => {
  const { users } = runtime.getState();

  const streamingUserIds = users
    .filter(
      ({ userId, state }) =>
        state[stateKey] ||
        kinds.some((kind) => runtime.getProducer(kind, userId))
    )
    .map(({ userId }) => userId);

  if (streamingUserIds.length === 0) return;

  const { channel, server } = permissions;

  const [channelUserIds, serverUserIds] = await Promise.all([
    getAffectedUserIdsForChannel(runtime.id, channel),
    server
      ? getUserIdsWithPermission(streamingUserIds, server)
      : streamingUserIds
  ]);

  const channelAllowed = new Set(channelUserIds);
  const serverAllowed = new Set(serverUserIds);

  const revokedUserIds = streamingUserIds.filter(
    (userId) => !channelAllowed.has(userId) || !serverAllowed.has(userId)
  );

  await Promise.all(
    revokedUserIds.map(async (userId) => {
      for (const kind of kinds) {
        const producer = runtime.getProducer(kind, userId);

        if (!producer) continue;

        runtime.removeProducer(userId, kind);

        pubsub.publishForChannel(
          runtime.id,
          ServerEvents.VOICE_PRODUCER_CLOSED,
          {
            channelId: runtime.id,
            remoteId: userId,
            kind,
            producerId: producer.id
          }
        );
      }

      runtime.updateUserState(userId, { [stateKey]: false });

      await publishVoicePresence(
        runtime,
        ServerEvents.USER_VOICE_STATE_UPDATE,
        {
          channelId: runtime.id,
          userId,
          state: runtime.getUserState(userId)
        }
      );
    })
  );
};

const stopRevokedVoiceStreams = async () => {
  const runtimes = VoiceRuntime.getAll();

  await Promise.all(
    runtimes.flatMap((runtime) =>
      REVOCABLE_STREAMS.map((stream) =>
        stopRevokedStreamsInRuntime(runtime, stream)
      )
    )
  );
};

export { stopRevokedVoiceStreams, STREAM_KIND_PERMISSIONS };
