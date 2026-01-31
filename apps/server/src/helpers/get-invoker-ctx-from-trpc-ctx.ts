import type { TInvokerContext } from '@sharkord/shared';
import type { Context } from '../utils/trpc';

const getInvokerCtxFromTrpcCtx = (ctx: Context): TInvokerContext => {
  return {
    userId: ctx.user.id,
    currentVoiceChannelId: ctx.currentVoiceChannelId
  };
};

export { getInvokerCtxFromTrpcCtx };
