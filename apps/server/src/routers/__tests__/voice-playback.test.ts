import { Permission, StreamKind } from '@sharkord/shared';
import { afterEach, describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { rolePermissions } from '../../db/schema';
import { VoiceRuntime } from '../../runtimes/voice';

const CHANNEL_ID = 2;
const BROADCASTER = 3;
const firstViewer = 1;
const secondViewer = 2;

describe('voice.setConsumerPlayback', () => {
  let runtime: VoiceRuntime | undefined;

  afterEach(async () => {
    await runtime?.destroy();
    runtime = undefined;
  });

  const setupStreams = async () => {
    const room = new VoiceRuntime(CHANNEL_ID);
    runtime = room;
    await room.init();

    for (const userId of [firstViewer, secondViewer, BROADCASTER]) {
      room.addUser(userId, { micMuted: false, soundMuted: false });
    }

    const router = room.getRouter();
    const transport = await router.createDirectTransport();
    const screen = await transport.produce({
      kind: 'video',
      rtpParameters: {
        codecs: [{ mimeType: 'video/VP8', clockRate: 90000, payloadType: 96 }],
        encodings: [{ ssrc: 1001 }]
      }
    });
    const camera = await transport.produce({
      kind: 'video',
      rtpParameters: {
        codecs: [{ mimeType: 'video/VP8', clockRate: 90000, payloadType: 96 }],
        encodings: [{ ssrc: 1002 }]
      }
    });
    room.addProducer(BROADCASTER, StreamKind.SCREEN, screen);
    room.addProducer(BROADCASTER, StreamKind.VIDEO, camera);

    const currentVoiceChannelId = CHANNEL_ID;
    const { caller } = await initTest(firstViewer, undefined, {
      currentVoiceChannelId
    });
    const { caller: other } = await initTest(secondViewer, undefined, {
      currentVoiceChannelId
    });
    await caller.voice.createConsumerTransport();
    await other.voice.createConsumerTransport();

    const consumeInput = {
      remoteId: BROADCASTER,
      rtpCapabilities: router.rtpCapabilities
    };
    const screenInput = { ...consumeInput, kind: StreamKind.SCREEN };
    const cameraInput = { ...consumeInput, kind: StreamKind.VIDEO };
    const { consumerId } = await caller.voice.consume(screenInput);
    const { consumerId: otherConsumerId } =
      await other.voice.consume(screenInput);
    const { consumerId: cameraId } = await caller.voice.consume(cameraInput);

    return {
      room,
      caller,
      other,
      transport,
      screen,
      camera,
      consumeInput,
      screenInput,
      screenPlayback: {
        remoteId: BROADCASTER,
        kind: StreamKind.SCREEN as const,
        consumerId,
        paused: true
      },
      otherConsumerId,
      cameraPlayback: {
        remoteId: BROADCASTER,
        kind: StreamKind.VIDEO as const,
        consumerId: cameraId,
        paused: true
      }
    };
  };

  test('pauses and resumes only the requesting viewer, including late screen audio', async () => {
    const {
      room,
      caller,
      other,
      transport,
      screen,
      camera,
      consumeInput,
      screenPlayback,
      cameraPlayback
    } = await setupStreams();
    const ownScreen = room.getConsumer(
      firstViewer,
      BROADCASTER,
      StreamKind.SCREEN
    );
    const ownCamera = room.getConsumer(
      firstViewer,
      BROADCASTER,
      StreamKind.VIDEO
    );
    const otherScreen = room.getConsumer(
      secondViewer,
      BROADCASTER,
      StreamKind.SCREEN
    );

    await caller.voice.setConsumerPlayback(screenPlayback);
    expect(ownScreen?.paused).toBe(true);
    expect(ownCamera?.paused).toBe(false);
    expect(otherScreen?.paused).toBe(false);
    expect(screen.paused).toBe(false);

    const audio = await transport.produce({
      kind: 'audio',
      rtpParameters: {
        codecs: [
          {
            mimeType: 'audio/opus',
            clockRate: 48000,
            payloadType: 111,
            channels: 2
          }
        ],
        encodings: [{ ssrc: 1003 }]
      }
    });
    room.addProducer(BROADCASTER, StreamKind.SCREEN_AUDIO, audio);
    const audioInput = { ...consumeInput, kind: StreamKind.SCREEN_AUDIO };
    await caller.voice.consume(audioInput);
    await other.voice.consume(audioInput);
    const ownAudio = room.getConsumer(
      firstViewer,
      BROADCASTER,
      StreamKind.SCREEN_AUDIO
    );
    const otherAudio = room.getConsumer(
      secondViewer,
      BROADCASTER,
      StreamKind.SCREEN_AUDIO
    );
    expect(ownAudio?.paused).toBe(true);
    expect(otherAudio?.paused).toBe(false);

    await caller.voice.setConsumerPlayback({
      ...screenPlayback,
      paused: false
    });
    expect(ownScreen?.paused).toBe(false);
    expect(ownAudio?.paused).toBe(false);

    await caller.voice.setConsumerPlayback(cameraPlayback);
    expect(ownCamera?.paused).toBe(true);
    expect(ownScreen?.paused).toBe(false);
    expect(ownAudio?.paused).toBe(false);
    expect(camera.paused).toBe(false);

    await caller.voice.setConsumerPlayback({
      ...cameraPlayback,
      paused: false
    });
    expect(ownCamera?.paused).toBe(false);
    expect(otherScreen?.paused).toBe(false);
    expect(otherAudio?.paused).toBe(false);
    expect(audio.paused).toBe(false);
  });

  test('rejects consumer IDs from other viewers or a replaced stream', async () => {
    const { room, caller, screenInput, screenPlayback, otherConsumerId } =
      await setupStreams();

    await expect(
      caller.voice.setConsumerPlayback({
        ...screenPlayback,
        consumerId: otherConsumerId
      })
    ).rejects.toThrow('Consumer not found');
    await caller.voice.setConsumerPlayback(screenPlayback);
    const { consumerId } = await caller.voice.consume(screenInput);
    expect(consumerId).not.toBe(screenPlayback.consumerId);
    await expect(
      caller.voice.setConsumerPlayback(screenPlayback)
    ).rejects.toThrow('Consumer not found');
    expect(
      room.getConsumer(firstViewer, BROADCASTER, StreamKind.SCREEN)?.paused
    ).toBe(false);
    expect(
      room.getConsumer(secondViewer, BROADCASTER, StreamKind.SCREEN)?.paused
    ).toBe(false);
  });

  test('requires permission and active membership in the voice runtime', async () => {
    const { room, other, screenPlayback, otherConsumerId } =
      await setupStreams();
    const input = { ...screenPlayback, consumerId: otherConsumerId };
    const { caller: outside } = await initTest(secondViewer);

    await expect(outside.voice.setConsumerPlayback(input)).rejects.toThrow(
      'User is not in a voice channel'
    );
    room.removeUser(secondViewer);
    await expect(other.voice.setConsumerPlayback(input)).rejects.toThrow(
      'User is not in a voice channel'
    );

    await tdb
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, 2),
          eq(rolePermissions.permission, Permission.JOIN_VOICE_CHANNELS)
        )
      );
    await expect(other.voice.setConsumerPlayback(input)).rejects.toThrow(
      'Insufficient permissions'
    );
  });

  test('rejects a malformed consumer ID and non-video kinds', async () => {
    const { caller } = await initTest();
    const input = {
      remoteId: BROADCASTER,
      consumerId: crypto.randomUUID(),
      paused: true
    };

    await expect(
      caller.voice.setConsumerPlayback({
        ...input,
        consumerId: 'bad-id',
        kind: StreamKind.SCREEN
      })
    ).rejects.toThrow('Invalid UUID');
    await expect(
      caller.voice.setConsumerPlayback({
        ...input,
        kind: StreamKind.AUDIO as StreamKind.VIDEO
      })
    ).rejects.toThrow('Invalid option');
  });
});
