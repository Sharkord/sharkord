import { sha256 } from '@sharkord/shared';
import jwt from 'jsonwebtoken';
import { appRouter } from '../routers';
import { createMockContext } from './context';
import { TEST_SECRET_TOKEN } from './seed';

const getMockedToken = async (userId: number) => {
  const hashedToken = await sha256(TEST_SECRET_TOKEN);

  const token = jwt.sign({ userId: userId }, hashedToken, {
    expiresIn: '86400s'
  });

  return token;
};

const getCaller = async (userId: number) => {
  const mockedToken = await getMockedToken(userId);

  const caller = appRouter.createCaller(
    await createMockContext({
      customToken: mockedToken
    })
  );

  return { caller, mockedToken };
};

// this will basically simulate a specific user connecting to the server
const initTest = async (userId: number = 1) => {
  const { caller, mockedToken } = await getCaller(userId);
  const { handshakeHash } = await caller.others.handshake();

  const initialData = await caller.others.joinServer({
    handshakeHash: handshakeHash
  });

  return { caller, mockedToken, initialData };
};

export { getCaller, getMockedToken, initTest };
