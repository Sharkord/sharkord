import { sha256 } from '@sharkord/shared';
import jwt from 'jsonwebtoken';
import { TEST_SECRET_TOKEN } from './seed';

const getMockedToken = async (userId: number) => {
  // Use the same hashed test token that's in the database
  const hashedToken = await sha256(TEST_SECRET_TOKEN);
  
  const token = jwt.sign({ userId: userId }, hashedToken, {
    expiresIn: '86400s' // 1 day
  });

  return token;
};

export { getMockedToken };
