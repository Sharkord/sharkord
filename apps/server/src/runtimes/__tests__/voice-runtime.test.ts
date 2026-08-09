import { ServerEvents, StreamKind } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import type { Consumer, Producer } from 'mediasoup/types';
import { pubsub } from '../../utils/pubsub';
import { VoiceRuntime } from '../voice';

type TCloseHandler = () => void;

const createProducerStub = () => {
  const handlers: TCloseHandler[] = [];

  const stub = {
    closed: false,
    kind: 'audio',
    observer: {
      on: (event: string, handler: TCloseHandler) => {
        if (event === 'close') handlers.push(handler);
      }
    },
    close: () => {
      stub.closed = true;
      handlers.forEach((handler) => handler());
    }
  };

  return stub;
};

const createConsumerStub = createProducerStub;

let nextChannelId = 9000;

const createRuntime = () => new VoiceRuntime(nextChannelId++);

describe('VoiceRuntime destroy', () => {
  test('should announce the users still in the channel', async () => {
    const runtime = createRuntime();

    runtime.addUser(7, { micMuted: false, soundMuted: false });
    runtime.addUser(8, { micMuted: false, soundMuted: false });

    const left: number[] = [];

    const subscription = pubsub
      .subscribe(ServerEvents.USER_LEAVE_VOICE)
      .subscribe({
        next: ({ userId, channelId }) => {
          if (channelId === runtime.id) left.push(userId);
        }
      });

    await runtime.destroy();

    subscription.unsubscribe();

    expect(left.sort()).toEqual([7, 8]);
    expect(runtime.getState().users).toEqual([]);
  });
});

describe('VoiceRuntime producer and consumer maps', () => {
  test('should close the previous producer when one replaces it', () => {
    const runtime = createRuntime();
    const first = createProducerStub();
    const second = createProducerStub();

    runtime.addProducer(1, StreamKind.AUDIO, first as unknown as Producer);
    runtime.addProducer(1, StreamKind.AUDIO, second as unknown as Producer);

    expect(first.closed).toBe(true);
    expect(second.closed).toBe(false);
    expect(runtime.getProducer(StreamKind.AUDIO, 1)).toBe(
      second as unknown as Producer
    );
  });

  test('should keep producers of other kinds when one is replaced', () => {
    const runtime = createRuntime();
    const audio = createProducerStub();
    const screenAudio = createProducerStub();
    const replacement = createProducerStub();

    runtime.addProducer(1, StreamKind.AUDIO, audio as unknown as Producer);
    runtime.addProducer(
      1,
      StreamKind.SCREEN_AUDIO,
      screenAudio as unknown as Producer
    );
    runtime.addProducer(
      1,
      StreamKind.AUDIO,
      replacement as unknown as Producer
    );

    expect(screenAudio.closed).toBe(false);
    expect(runtime.getProducer(StreamKind.SCREEN_AUDIO, 1)).toBe(
      screenAudio as unknown as Producer
    );
  });

  test('should close the previous consumer when one replaces it', () => {
    const runtime = createRuntime();
    const first = createConsumerStub();
    const second = createConsumerStub();

    runtime.addConsumer(1, 2, StreamKind.AUDIO, first as unknown as Consumer);
    runtime.addConsumer(1, 2, StreamKind.AUDIO, second as unknown as Consumer);

    expect(first.closed).toBe(true);
    expect(second.closed).toBe(false);
  });

  test('should not let a replaced consumer evict the live one on close', () => {
    const runtime = createRuntime();
    const first = createConsumerStub();
    const second = createConsumerStub();

    runtime.addConsumer(1, 2, StreamKind.AUDIO, first as unknown as Consumer);
    runtime.addConsumer(1, 2, StreamKind.AUDIO, second as unknown as Consumer);

    // the orphan dying later must not remove the entry that replaced it
    first.close();

    expect(runtime.getConsumer(1, 2, StreamKind.AUDIO)).toBe(
      second as unknown as Consumer
    );
  });
});
