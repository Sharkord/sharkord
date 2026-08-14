import { describe, expect, test } from 'bun:test';
import { initTest } from '../../__tests__/helpers';

describe('trpc rate limiting', () => {
  // sendMessage rather than anything voice: its limiter is the smallest at 15, and nothing on
  // this path needs mediasoup
  const SEND_MESSAGE_LIMIT = 15;

  const send = () => ({ channelId: 999999, content: 'spam' });

  test('should bucket per user rather than per address', async () => {
    const { caller: spammer } = await initTest(1);
    const { caller: bystander } = await initTest(2);

    // both callers come from the same test transport, so any ip-keyed limiter would put
    // them in one bucket
    for (let attempt = 0; attempt < SEND_MESSAGE_LIMIT; attempt++) {
      await expect(spammer.messages.send(send())).rejects.toThrow(
        'Insufficient channel permissions'
      );
    }

    await expect(spammer.messages.send(send())).rejects.toThrow(
      'Too many requests. Please try again shortly.'
    );

    // the bystander spent none of their own allowance
    await expect(bystander.messages.send(send())).rejects.toThrow(
      'Insufficient channel permissions'
    );
  });
});
