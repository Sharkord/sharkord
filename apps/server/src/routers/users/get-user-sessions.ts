import { Permission } from '@sharkord/shared';
import z from 'zod';
import { getUserById } from '../../db/queries/users';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';
import { getOnlineUserIdsByIp } from '../../utils/wss';

const getUserSessionsRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number()
    })
  )
  .query(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    const user = await getUserById(input.userId);

    invariant(user, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    const canSeeSensitiveData = await ctx.hasPermission(
      Permission.VIEW_USER_SENSITIVE_DATA
    );

    const runtime = VoiceRuntime.findRuntimeByUserId(user.id);
    const sessions = [];

    for (const socket of ctx.getUserWs(user.id)) {
      const { session } = socket;

      if (!session) continue;

      const inVoice = !!runtime && session.voiceChannelId === runtime.id;
      let sharedIpUserIds: number[] = [];

      if (canSeeSensitiveData && session.ip) {
        const onlineUserIds = getOnlineUserIdsByIp(session.ip);

        sharedIpUserIds = onlineUserIds.filter((id) => id !== user.id);
      }

      sessions.push({
        ...session,
        ip: canSeeSensitiveData ? session.ip : null,
        location: canSeeSensitiveData ? session.location : null,
        voiceChannelId: inVoice ? session.voiceChannelId : null,
        sharedIpUserIds
      });
    }

    return sessions;
  });

export { getUserSessionsRoute };
