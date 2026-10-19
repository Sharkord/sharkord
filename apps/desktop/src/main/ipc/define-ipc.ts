import type { z } from 'zod';
import type { BridgeChannel } from '../../shared/bridge-channels';
import type { IpcChannel } from '../../shared/constants';

type TIpcCall<
  C extends IpcChannel | BridgeChannel,
  A extends z.ZodType<unknown[]>,
  R extends z.ZodType
> = {
  channel: C;
  args: A;
  result: R;
};

// the call is defined once using defineIpc, which ensures type safety for both the handler and the preload script
const defineIpc = <
  const C extends IpcChannel | BridgeChannel,
  A extends z.ZodType<unknown[]>,
  R extends z.ZodType
>(
  call: TIpcCall<C, A, R>
) => call;

export { defineIpc };
export type { TIpcCall };
