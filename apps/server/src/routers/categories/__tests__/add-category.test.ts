import { describe, test } from 'bun:test';
import { appRouter } from '../..';
import { createMockContext } from '../../../__tests__/context';
import { getMockedToken } from '../../../__tests__/helpers';

describe('addCategoryRoute', () => {
  test('should create a new category', async () => {
    const mockedToken = await getMockedToken(1);
    const caller = appRouter.createCaller(
      await createMockContext({
        customToken: mockedToken
      })
    );

    const { handshakeHash } = await caller.others.handshake();

    console.log('Handshake response:', handshakeHash);

    const initialData = await caller.others.joinServer({
      handshakeHash: handshakeHash
    });

    console.log('Initial data from joinServer:', initialData);

    // const response = await caller.categories.add({
    //   name: 'New Category'
    // });

    // console.log('Caller created with mocked token:', {
    //   mockedToken,
    //   caller,
    //   response
    // });
  });
});
