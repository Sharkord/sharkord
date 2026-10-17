import { ipcMain } from 'electron';
import type { z } from 'zod';
import type { BridgeChannel } from '../../shared/bridge-channels';
import type { IpcChannel } from '../../shared/constants';
import type { TIpcCall } from './define-ipc';

const handleIpc = <
  C extends TIpcCall<
    IpcChannel | BridgeChannel,
    z.ZodType<unknown[]>,
    z.ZodType
  >
>(
  call: C,
  handler: (
    ...args: z.output<C['args']>
  ) => z.output<C['result']> | Promise<z.output<C['result']>>
) => {
  ipcMain.handle(call.channel, (_event, ...args: unknown[]) => {
    const parsed = call.args.safeParse(args);

    if (!parsed.success) {
      throw new Error(`Invalid arguments for ${call.channel}`);
    }

    return handler(...(parsed.data as z.output<C['args']>));
  });
};

export { handleIpc };
