import type { TIMessage } from '@sharkord/shared';
import { db } from '../..';
import { messages } from '../../schema';

const createMessage = async (message: Omit<TIMessage, 'createdAt'>) =>
  db
    .insert(messages)
    .values({
      ...message,
      createdAt: Date.now()
    })
    .returning()
    .get();

export { createMessage };
