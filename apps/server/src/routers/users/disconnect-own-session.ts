import { DisconnectCode } from '@sharkord/shared';
import z from 'zod';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const disconnectOwnSessionRoute = protectedProcedure
  .input(
    z.object({
      sessionId: z.string().max(64)
    })
  )
  .mutation(async ({ ctx, input }) => {
    const sockets = ctx.getUserWs(ctx.userId);
    const socket = sockets.find(
      ({ session }) => session?.id === input.sessionId
    );

    invariant(socket, {
      code: 'NOT_FOUND',
      message: 'Session not found'
    });

    const ownWs = ctx.getOwnWs();

    invariant(socket !== ownWs, {
      code: 'BAD_REQUEST',
      message: 'You cannot disconnect the session you are using.'
    });

    socket.close(DisconnectCode.KICKED, 'Disconnected from another session.');
    socket.session = undefined;
  });

export { disconnectOwnSessionRoute };
