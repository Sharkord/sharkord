import type { TInvokerContext, TInvokerSource } from '@sharkord/shared';
import type { Context } from '../utils/trpc';

type TInvocation = {
  source: TInvokerSource;
  channelId?: number;
  parentMessageId?: number;
  messageId?: number;
};

const getInvokerCtxFromTrpcCtx = (
  ctx: Context,
  invocation: TInvocation
): TInvokerContext => {
  return {
    userId: ctx.user.id,
    currentVoiceChannelId: ctx.currentVoiceChannelId,
    locale: ctx.locale,
    ...invocation
  };
};

export { getInvokerCtxFromTrpcCtx };
