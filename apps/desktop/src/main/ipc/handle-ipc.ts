import electron, { type WebContents } from 'electron';
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
  ) => z.output<C['result']> | Promise<z.output<C['result']>>,
  isAllowedSender: (sender: WebContents) => boolean
) => {
  // default import so that tests can load the call files without an electron runtime
  electron.ipcMain.handle(call.channel, (event, ...args: unknown[]) => {
    if (!isAllowedSender(event.sender)) {
      throw new Error(`Untrusted sender for ${call.channel}`);
    }

    const parsed = call.args.safeParse(args);

    if (!parsed.success) {
      throw new Error(`Invalid arguments for ${call.channel}`);
    }

    return handler(...(parsed.data as z.output<C['args']>));
  });
};

const anySender = () => true;

export { anySender, handleIpc };
