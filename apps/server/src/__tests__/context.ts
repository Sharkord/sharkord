import { type TConnectionParams } from '@sharkord/shared';
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws';
import type { IncomingMessage } from 'http';
import { createContext } from '../utils/wss';

type TMockContextOptions = {
  customToken?: string;
  headers?: IncomingMessage['headers'];
  remoteAddress?: string;
};

const createMockContextOptions = async (
  opts?: TMockContextOptions
): Promise<CreateWSSContextFnOptions> => {
  const { customToken, headers, remoteAddress } = opts ?? {};

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
      headers: headers ?? {},
      socket: {
        remoteAddress: remoteAddress ?? '127.0.0.1'
      }
    } as IncomingMessage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: undefined as any
  };
};

const createMockContext = async (opts?: TMockContextOptions) => {
  const contextOpts = await createMockContextOptions(opts);
  const ctx = await createContext(contextOpts);

  return ctx;
};

export { createMockContext, type TMockContextOptions };
