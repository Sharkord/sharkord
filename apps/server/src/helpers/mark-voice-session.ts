import type { Context } from '../utils/trpc';

const markVoiceSession = (ctx: Context, channelId: number) => {
  for (const socket of ctx.getUserWs(ctx.userId)) {
    if (socket.session) {
      socket.session.voiceChannelId = null;
    }
  }

  const ownWs = ctx.getOwnWs();

  if (ownWs?.session) {
    ownWs.session.voiceChannelId = channelId;
  }
};

export { markVoiceSession };
