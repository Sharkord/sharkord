import { ServerEvents, type StreamKind } from '@sharkord/shared';
import { observable } from '@trpc/server/observable';
import { protectedProcedure } from '../../utils/trpc';

type TVoiceProducerEvent = {
  channelId: number;
  remoteId: number;
  kind: StreamKind;
};

// voice presence goes only to who can see the channel, see publishVoicePresence
const onUserJoinVoiceRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(ctx.user.id, ServerEvents.USER_JOIN_VOICE);
  }
);

const onUserLeaveVoiceRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(ctx.user.id, ServerEvents.USER_LEAVE_VOICE);
  }
);

const onUserUpdateVoiceStateRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.user.id,
      ServerEvents.USER_VOICE_STATE_UPDATE
    );
  }
);

// reactions render on the voice cards of whichever channel the user is looking at, which is
// not necessarily the one they are connected to
const onUserVoiceReactionRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.user.id,
      ServerEvents.USER_VOICE_REACTION
    );
  }
);

const onUserVoiceMovedRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(ctx.user.id, ServerEvents.USER_VOICE_MOVED);
  }
);

const onVoiceChannelStateUpdateRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.user.id,
      ServerEvents.VOICE_CHANNEL_STATE_UPDATE
    );
  }
);

const onVoiceAddExternalStreamRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.user.id,
      ServerEvents.VOICE_ADD_EXTERNAL_STREAM
    );
  }
);

const onVoiceUpdateExternalStreamRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.user.id,
      ServerEvents.VOICE_UPDATE_EXTERNAL_STREAM
    );
  }
);

const onVoiceRemoveExternalStreamRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.user.id,
      ServerEvents.VOICE_REMOVE_EXTERNAL_STREAM
    );
  }
);

// these events are channel-scoped (only sent to users in the same voice channel)
// they relate to actual media streaming, not UI state
const onVoiceNewProducerRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    if (!ctx.currentVoiceChannelId) {
      return observable<TVoiceProducerEvent>(() => () => {});
    }

    return ctx.pubsub.subscribeForChannel(
      ctx.currentVoiceChannelId,
      ServerEvents.VOICE_NEW_PRODUCER
    );
  }
);

const onVoiceProducerClosedRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    if (!ctx.currentVoiceChannelId) {
      return observable<TVoiceProducerEvent>(() => () => {});
    }

    return ctx.pubsub.subscribeForChannel(
      ctx.currentVoiceChannelId,
      ServerEvents.VOICE_PRODUCER_CLOSED
    );
  }
);

export {
  onUserJoinVoiceRoute,
  onUserLeaveVoiceRoute,
  onUserUpdateVoiceStateRoute,
  onUserVoiceMovedRoute,
  onUserVoiceReactionRoute,
  onVoiceAddExternalStreamRoute,
  onVoiceChannelStateUpdateRoute,
  onVoiceNewProducerRoute,
  onVoiceProducerClosedRoute,
  onVoiceRemoveExternalStreamRoute,
  onVoiceUpdateExternalStreamRoute
};
