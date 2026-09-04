import { getErrorMessage, type TPluginHookResult } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { pluginLogger } from './plugin-logger';

// a reject reason is written by a plugin and shown to a user, so it is capped
// rather than passed through at whatever length the plugin produced
const MAX_REJECT_LENGTH = 200;

type THookEntry<TPayload, TUpdate> = {
  pluginId: string;
  handlers: Array<(payload: TPayload) => Promise<TPluginHookResult<TUpdate>>>;
};

type TRunHookOptions<TPayload, TUpdate> = {
  entries: Array<THookEntry<TPayload, TUpdate>>;
  payload: TPayload;
  normalize?: (payload: TPayload, pluginId: string) => TPayload;
  reject?: (message: string) => never;
};

const runHook = async <TPayload extends object, TUpdate extends object>({
  entries,
  payload,
  normalize,
  reject = (message: string): never => {
    throw new TRPCError({ code: 'BAD_REQUEST', message });
  }
}: TRunHookOptions<TPayload, TUpdate>): Promise<TPayload> => {
  let current = payload;

  for (const { pluginId, handlers } of entries) {
    for (const handler of handlers) {
      let result: TPluginHookResult<TUpdate> = undefined;

      try {
        result = await handler({ ...current });
      } catch (error) {
        pluginLogger.log(
          pluginId,
          'error',
          `Hook failed: ${getErrorMessage(error)}`
        );

        reject('A plugin failed while checking this request.');
      }

      if (!result) continue;

      if ('reject' in result) {
        reject(String(result.reject).slice(0, MAX_REJECT_LENGTH));
      }

      if ('update' in result) {
        current = { ...current, ...result.update };

        if (normalize) current = normalize(current, pluginId);
      }
    }
  }

  return current;
};

export { runHook };
export type { THookEntry };
