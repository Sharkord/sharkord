import { ServerEvents, StreamKind } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import type { Consumer, Producer } from 'mediasoup/types';
import { eventBus } from '../../plugins/event-bus';
import { pubsub } from '../../utils/pubsub';
import { VoiceRuntime } from '../voice';

type TCloseHandler = () => void;

let nextProducerId = 0;

const createProducerStub = () => {
  const handlers: TCloseHandler[] = [];

  const stub = {
    id: `producer-${nextProducerId++}`,
    closed: false,
    paused: false,
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

describe('VoiceRuntime external streams', () => {
  // ids come from a counter that starts at zero, so the second stream in a channel is id 1,
  // which is also the first user id. the client cannot decide "this producer is mine" from
  // the id alone, see isOwnProducerEvent
  test('should hand out ids from zero, colliding with user ids', () => {
    const runtime = createRuntime();

    const first = runtime.createExternalStream({
      title: 'First',
      key: 'first',
      pluginId: 'music-bot',
      producers: { audio: createProducerStub() as unknown as Producer }
    });

    const second = runtime.createExternalStream({
      title: 'Second',
      key: 'second',
      pluginId: 'music-bot',
      producers: { audio: createProducerStub() as unknown as Producer }
    });

    expect(first).toBe(0);
    expect(second).toBe(1);
  });

  test('should expose a new stream to the joining snapshot', () => {
    const runtime = createRuntime();

    const streamId = runtime.createExternalStream({
      title: 'Music',
      key: 'music',
      pluginId: 'music-bot',
      producers: { audio: createProducerStub() as unknown as Producer }
    });

    expect(runtime.getRemoteIds(1).remoteExternalStreamIds).toEqual([streamId]);
  });
});

describe('VoiceRuntime producer listing', () => {
  test('should list every kind with the id a consumer needs', () => {
    const runtime = createRuntime();
    const audio = createProducerStub();
    const screen = createProducerStub();

    runtime.addProducer(1, StreamKind.AUDIO, audio as unknown as Producer);
    runtime.addProducer(2, StreamKind.SCREEN, screen as unknown as Producer);

    expect(runtime.listProducers()).toEqual([
      {
        userId: 1,
        kind: StreamKind.AUDIO,
        producerId: audio.id,
        paused: false
      },
      {
        userId: 2,
        kind: StreamKind.SCREEN,
        producerId: screen.id,
        paused: false
      }
    ]);
  });

  test('should drop a producer that closed', () => {
    const runtime = createRuntime();
    const audio = createProducerStub();

    runtime.addProducer(1, StreamKind.AUDIO, audio as unknown as Producer);
    runtime.removeProducer(1, StreamKind.AUDIO);

    expect(runtime.listProducers()).toEqual([]);
  });

  // external streams belong to a plugin and have no user behind them
  test('should leave external streams out', () => {
    const runtime = createRuntime();

    runtime.createExternalStream({
      title: 'Radio',
      key: 'radio',
      pluginId: 'plugin-a',
      producers: { audio: createProducerStub() as unknown as Producer }
    });

    expect(runtime.listProducers()).toEqual([]);
  });
});

describe('VoiceRuntime producer events', () => {
  const listen = (event: 'voice:producer_added' | 'voice:producer_removed') => {
    const seen: unknown[] = [];

    const unregister = eventBus.register('test-plugin', event, (payload) => {
      seen.push(payload);
    });

    return { seen, unregister };
  };

  test('should announce a producer that arrives', async () => {
    const runtime = createRuntime();
    const producer = createProducerStub();
    const { seen, unregister } = listen('voice:producer_added');

    runtime.addProducer(3, StreamKind.AUDIO, producer as unknown as Producer);

    await Bun.sleep(0);
    unregister();

    expect(seen).toEqual([
      {
        channelId: runtime.id,
        userId: 3,
        kind: StreamKind.AUDIO,
        producerId: producer.id
      }
    ]);
  });

  test('should announce a producer that ends', async () => {
    const runtime = createRuntime();
    const producer = createProducerStub();

    runtime.addProducer(3, StreamKind.AUDIO, producer as unknown as Producer);

    const { seen, unregister } = listen('voice:producer_removed');

    runtime.removeProducer(3, StreamKind.AUDIO);

    await Bun.sleep(0);
    unregister();

    expect(seen).toEqual([
      {
        channelId: runtime.id,
        userId: 3,
        kind: StreamKind.AUDIO,
        producerId: producer.id
      }
    ]);
  });

  // the close observer is the only path, so a replacement has to report the
  // producer it replaced rather than the new one
  test('should announce the replaced producer when one takes over', async () => {
    const runtime = createRuntime();
    const first = createProducerStub();
    const second = createProducerStub();

    runtime.addProducer(3, StreamKind.AUDIO, first as unknown as Producer);

    const { seen, unregister } = listen('voice:producer_removed');

    runtime.addProducer(3, StreamKind.AUDIO, second as unknown as Producer);

    await Bun.sleep(0);
    unregister();

    expect(seen).toEqual([
      {
        channelId: runtime.id,
        userId: 3,
        kind: StreamKind.AUDIO,
        producerId: first.id
      }
    ]);
  });
});
