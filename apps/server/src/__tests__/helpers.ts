import { sha256, UploadHeaders } from '@sharkord/shared';
import jwt from 'jsonwebtoken';
import type WebSocket from 'ws';
import { appRouter } from '../routers';
import type { Context } from '../utils/trpc';
import { createMockContext, type TMockContextOptions } from './context';
import { TEST_SECRET_TOKEN } from './seed';
import { testsBaseUrl } from './setup';

const getMockedToken = async (userId: number, tokenVersion: number = 0) => {
  const hashedToken = await sha256(TEST_SECRET_TOKEN);

  const token = jwt.sign({ userId: userId, tokenVersion }, hashedToken, {
    expiresIn: '86400s'
  });

  return token;
};

type TFakeSocket = WebSocket & {
  closes: { code: number; reason?: string }[];
};

const createFakeSocket = () => {
  const closes: TFakeSocket['closes'] = [];

  return {
    closes,
    close: (code: number, reason?: string) => closes.push({ code, reason })
  } as unknown as TFakeSocket;
};

const getCaller = async (
  userId: number,
  connection?: Omit<TMockContextOptions, 'customToken'>,
  ctxOverrides?: Partial<Context>
) => {
  const mockedToken = await getMockedToken(userId);

  const caller = appRouter.createCaller({
    ...(await createMockContext({
      ...connection,
      customToken: mockedToken
    })),
    ...ctxOverrides
  });

  return { caller, mockedToken };
};

// this will basically simulate a specific user connecting to the server
const initTest = async (
  userId: number = 1,
  connection?: Omit<TMockContextOptions, 'customToken'>,
  ctxOverrides?: Partial<Context>
) => {
  const { caller, mockedToken } = await getCaller(
    userId,
    connection,
    ctxOverrides
  );
  const { handshakeHash } = await caller.others.handshake();

  const initialData = await caller.others.joinServer({
    handshakeHash: handshakeHash
  });

  return { caller, mockedToken, initialData };
};

const login = async (
  identity: string,
  password: string,
  invite?: string,
  headers?: Record<string, string>
) =>
  fetch(`${testsBaseUrl}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({
      identity,
      password,
      invite
    })
  });

const uploadFile = async (file: File, token: string) =>
  fetch(`${testsBaseUrl}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      [UploadHeaders.TYPE]: file.type,
      [UploadHeaders.CONTENT_LENGTH]: file.size.toString(),
      [UploadHeaders.ORIGINAL_NAME]: file.name,
      [UploadHeaders.TOKEN]: token
    },
    body: file
  });

export {
  createFakeSocket,
  getCaller,
  getMockedToken,
  initTest,
  login,
  uploadFile,
  type TFakeSocket
};
