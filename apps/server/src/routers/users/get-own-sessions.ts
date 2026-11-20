import { VoiceRuntime } from '../../runtimes/voice';
import { protectedProcedure } from '../../utils/trpc';

// no shared ip accounts here: those are other users' data, only for moderators
const getOwnSessionsRoute = protectedProcedure.query(async ({ ctx }) => {
  const runtime = VoiceRuntime.findRuntimeByUserId(ctx.userId);
  const ownWs = ctx.getOwnWs();
  const currentSessionId = ownWs?.session?.id;
  const sessions = [];

  for (const socket of ctx.getUserWs(ctx.userId)) {
    const { session } = socket;

    if (!session) continue;

    const inVoice = !!runtime && session.voiceChannelId === runtime.id;

    sessions.push({
      ...session,
      voiceChannelId: inVoice ? session.voiceChannelId : null,
      current: session.id === currentSessionId
    });
  }

  return sessions;
});

export { getOwnSessionsRoute };
