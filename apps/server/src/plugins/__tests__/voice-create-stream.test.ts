import { afterEach, describe, expect, test } from 'bun:test';
import type { PlainTransport, Producer } from 'mediasoup/types';
import { VoiceRuntime } from '../../runtimes/voice';
import { createUnloadContext } from '../create-context';
import { pluginLogger } from '../plugin-logger';

const CHANNEL_ID = 9502;

let runtime: VoiceRuntime | undefined;
let transport: PlainTransport | undefined;

const ctx = createUnloadContext({
  pluginId: 'plugin-a',
  scopedLogger: pluginLogger.createScopedLogger('plugin-a'),
  pluginPath: '',
  dataPath: '',
  setUiEnabled: () => {}
});

const startAudioProducer = async (): Promise<Producer> => {
  runtime = new VoiceRuntime(CHANNEL_ID);

  await runtime.init();

  transport = await runtime.getRouter().createPlainTransport({
    listenInfo: { protocol: 'udp', ip: '127.0.0.1' }
  });

  return transport.produce({
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
      encodings: [{ ssrc: 22222222 }]
    }
  });
};

afterEach(async () => {
  transport?.close();
  transport = undefined;

  await runtime?.destroy();
  runtime = undefined;
});

describe('voice.createStream', () => {
  test('should put the owner into the channel state', async () => {
    const audio = await startAudioProducer();

    const { streamId } = ctx.voice.createStream({
      channelId: CHANNEL_ID,
      title: 'OBS',
      key: 'obs',
      ownerUserId: 2,
      producers: { audio }
    });

    expect(runtime!.getState().externalStreams[streamId]!.ownerUserId).toBe(2);
  });

  test('should leave a stream without an owner unowned', async () => {
    const audio = await startAudioProducer();

    const { streamId } = ctx.voice.createStream({
      channelId: CHANNEL_ID,
      title: 'Music',
      key: 'music',
      producers: { audio }
    });

    expect(
      runtime!.getState().externalStreams[streamId]!.ownerUserId
    ).toBeUndefined();
  });
});
