import { sha256, UploadHeaders } from '@sharkord/shared';
import jwt from 'jsonwebtoken';
import { appRouter } from '../routers';
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

const getCaller = async (
  userId: number,
  connection?: Omit<TMockContextOptions, 'customToken'>
) => {
  const mockedToken = await getMockedToken(userId);

  const caller = appRouter.createCaller(
    await createMockContext({
      ...connection,
      customToken: mockedToken
    })
  );

  return { caller, mockedToken };
};

// this will basically simulate a specific user connecting to the server
const initTest = async (
  userId: number = 1,
  connection?: Omit<TMockContextOptions, 'customToken'>
) => {
  const { caller, mockedToken } = await getCaller(userId, connection);
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

export { getCaller, getMockedToken, initTest, login, uploadFile };
