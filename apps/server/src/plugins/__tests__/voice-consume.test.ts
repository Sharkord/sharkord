import { StreamKind } from '@sharkord/shared';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test';
import type { PlainTransport, Producer } from 'mediasoup/types';
import { pluginManager } from '..';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { VoiceRuntime } from '../../runtimes/voice';
import {
  closePluginVoiceConsumers,
  consumeVoiceProducer,
  getPluginVoiceConsumerCount
} from '../actions/consume-voice-producer';
import { pluginLogger } from '../plugin-logger';

const logger = pluginLogger.createScopedLogger('plugin-a');

// a producer nobody is sending to: mediasoup accepts the rtpParameters and
// creates a real producer, which is enough for everything but the packets. no
// browser can be driven from here, so `onRtp` firing is what stays uncovered
const CHANNEL_ID = 9500;

let runtime: VoiceRuntime | undefined;
let transport: PlainTransport | undefined;

const startProducing = async (userId: number): Promise<Producer> => {
  runtime = new VoiceRuntime(CHANNEL_ID);

  await runtime.init();

  transport = await runtime.getRouter().createPlainTransport({
    listenInfo: { protocol: 'udp', ip: '127.0.0.1' }
  });

  const producer = await transport.produce({
    kind: 'audio',
    rtpParameters: {
      codecs: [
        {
          mimeType: 'audio/opus',
          payloadType: 100,
          clockRate: 48000,
          channels: 2
        }
      ],
      encodings: [{ ssrc: 11111111 }]
    }
  });

  runtime.addProducer(userId, StreamKind.AUDIO, producer);

  return producer;
};

beforeAll(loadMockedPlugins);
beforeEach(resetPluginMocks);

afterEach(async () => {
  closePluginVoiceConsumers('plugin-a');

  transport?.close();
  transport = undefined;

  await runtime?.destroy();
  runtime = undefined;
});

describe('consumeVoiceProducer', () => {
  test('should consume a live producer and describe what it is sending', async () => {
    const producer = await startProducing(1);

    const handle = await consumeVoiceProducer('plugin-a', logger, {
      channelId: CHANNEL_ID,
      userId: 1,
      kind: StreamKind.AUDIO,
      onRtp: () => {}
    });

    expect(handle.producerId).toBe(producer.id);
    expect(handle.rtpParameters.codecs[0]!.mimeType).toBe('audio/opus');
  });

  test('should refuse a user who is not producing that kind', async () => {
    await startProducing(1);

    await expect(
      consumeVoiceProducer('plugin-a', logger, {
        channelId: CHANNEL_ID,
        userId: 2,
        kind: StreamKind.AUDIO,
        onRtp: () => {}
      })
    ).rejects.toThrow('has no audio producer');
  });

  test('should refuse a channel with no voice runtime', async () => {
    await expect(
      consumeVoiceProducer('plugin-a', logger, {
        channelId: 9999,
        userId: 1,
        kind: StreamKind.AUDIO,
        onRtp: () => {}
      })
    ).rejects.toThrow('Voice runtime not found');
  });

  test('should close on its own when the producer ends', async () => {
    const producer = await startProducing(1);

    await consumeVoiceProducer('plugin-a', logger, {
      channelId: CHANNEL_ID,
      userId: 1,
      kind: StreamKind.AUDIO,
      onRtp: () => {}
    });

    expect(getPluginVoiceConsumerCount('plugin-a')).toBe(1);

    producer.close();

    await Bun.sleep(10);

    expect(getPluginVoiceConsumerCount('plugin-a')).toBe(0);
  });

  test('should survive being closed twice', async () => {
    await startProducing(1);

    const handle = await consumeVoiceProducer('plugin-a', logger, {
      channelId: CHANNEL_ID,
      userId: 1,
      kind: StreamKind.AUDIO,
      onRtp: () => {}
    });

    handle.close();
    handle.close();

    expect(getPluginVoiceConsumerCount('plugin-a')).toBe(0);
  });

  // the leak this guards against outlives the plugin: a consumer nobody closed
  // keeps pulling rtp into a handler that no longer exists
  test('should close what a plugin left open when it unloads', async () => {
    await startProducing(1);

    await consumeVoiceProducer('plugin-a', logger, {
      channelId: CHANNEL_ID,
      userId: 1,
      kind: StreamKind.AUDIO,
      onRtp: () => {}
    });

    expect(getPluginVoiceConsumerCount('plugin-a')).toBe(1);

    closePluginVoiceConsumers('plugin-a');

    expect(getPluginVoiceConsumerCount('plugin-a')).toBe(0);
  });

  // the same cleanup, reached the way it actually happens
  test('should close what a plugin left open when the manager unloads it', async () => {
    await pluginManager.load('plugin-b');
    await startProducing(1);

    await consumeVoiceProducer('plugin-b', logger, {
      channelId: CHANNEL_ID,
      userId: 1,
      kind: StreamKind.AUDIO,
      onRtp: () => {}
    });

    expect(getPluginVoiceConsumerCount('plugin-b')).toBe(1);

    await pluginManager.unload('plugin-b');

    expect(getPluginVoiceConsumerCount('plugin-b')).toBe(0);
  });

  test('should leave another plugin alone when one unloads', async () => {
    await startProducing(1);

    await consumeVoiceProducer('plugin-b', logger, {
      channelId: CHANNEL_ID,
      userId: 1,
      kind: StreamKind.AUDIO,
      onRtp: () => {}
    });

    closePluginVoiceConsumers('plugin-a');

    expect(getPluginVoiceConsumerCount('plugin-b')).toBe(1);

    closePluginVoiceConsumers('plugin-b');
  });
});
