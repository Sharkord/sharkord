import { type TConnectionParams } from '@sharkord/shared';
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws';
import type { IncomingMessage } from 'http';
import { createContext } from '../utils/wss';

const createMockContextOptions = async (opts?: {
  customToken?: string;
}): Promise<CreateWSSContextFnOptions> => {
  const { customToken } = opts ?? {};

  const token = customToken;

  return {
    info: {
      connectionParams: {
        token
      } as TConnectionParams,
      accept: 'application/jsonl',
      type: 'subscription',
      isBatchCall: false,
      calls: [],
      signal: new AbortController().signal,
      url: new URL('ws://localhost:3000')
    },
    req: {
      headers: {},
      socket: {
        remoteAddress: '127.0.0.1'
      }
    } as IncomingMessage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: undefined as any
  };
};

const createMockContext = async (opts?: { customToken?: string }) => {
  const contextOpts = await createMockContextOptions(opts);
  const ctx = await createContext(contextOpts);

  return ctx;
};

export { createMockContext };
