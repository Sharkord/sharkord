import { ChannelType, StreamKind } from '@sharkord/shared';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test';
import { and, eq } from 'drizzle-orm';
import sdpTransform from 'sdp-transform';
import { login } from '../../../__tests__/helpers';
import { testsBaseUrl } from '../../../__tests__/setup';
import { config } from '../../../config';
import { db } from '../../../db';
import { channels as channelsTable } from '../../../db/schema';
import { VoiceRuntime } from '../../../runtimes/voice';
import { closeWhipSession, whipSessions } from '../sessions';

const WHIP_KEY = 'whip-test-key';

// the global-key tests never touch the database, so a synthetic channel id
// keeps them independent from the per-test reseeded db; user-token tests
// resolve a real seeded voice channel instead (permissions are checked
// against it)
let CHANNEL_ID = 424242;
const FINGERPRINT =
  '00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF';

// an OBS-like offer: opus + H264, no simulcast, host candidates inline
const buildOffer = () =>
  [
    'v=0',
    'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
    's=OBS Studio',
    't=0 0',
    'a=group:BUNDLE 0 1',
    'a=ice-options:trickle',
    'm=audio 9 UDP/TLS/RTP/SAVPF 96',
    'c=IN IP4 0.0.0.0',
    'a=ice-ufrag:obsau1',
    'a=ice-pwd:obsaupwdobsaupwdobsaupwd',
    `a=fingerprint:sha-256 ${FINGERPRINT}`,
    'a=setup:actpass',
    'a=mid:0',
    'a=sendonly',
    'a=rtpmap:96 opus/48000/2',
    'a=fmtp:96 minptime=10;useinbandfec=1',
    'a=ssrc:111111 cname:obsaudio',
    'a=candidate:1 1 UDP 2130706431 192.168.1.10 50000 typ host',
    'm=video 9 UDP/TLS/RTP/SAVPF 97',
    'c=IN IP4 0.0.0.0',
    'a=ice-ufrag:obsvu1',
    'a=ice-pwd:obsvupwdobsvupwdobsvupwd',
    `a=fingerprint:sha-256 ${FINGERPRINT}`,
    'a=setup:actpass',
    'a=mid:1',
    'a=sendonly',
    'a=rtpmap:97 H264/90000',
    'a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f',
    'a=rtcp-fb:97 nack',
    'a=rtcp-fb:97 nack pli',
    'a=ssrc:222222 cname:obsvideo',
    'a=candidate:1 1 UDP 2130706431 192.168.1.10 50002 typ host',
    ''
  ].join('\r\n');

const createSession = async () => {
  const response = await fetch(`${testsBaseUrl}/whip/${CHANNEL_ID}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHIP_KEY}`,
      'Content-Type': 'application/sdp'
    },
    body: buildOffer()
  });

  return response;
};

describe('/whip', () => {
  let runtime: VoiceRuntime;
  let originalWhipConfig: { enabled: boolean; key: string };
  const createdRuntimes: VoiceRuntime[] = [];

  beforeAll(async () => {
    originalWhipConfig = { ...config.whip };

    config.whip.enabled = true;
    config.whip.key = WHIP_KEY;

    runtime = new VoiceRuntime(CHANNEL_ID);
    await runtime.init();
  });

  afterAll(async () => {
    for (const sessionId of [...whipSessions.keys()]) {
      closeWhipSession(sessionId);
    }

    for (const runtimeToClose of createdRuntimes) {
      await runtimeToClose.destroy();
    }

    await runtime.destroy();

    config.whip.enabled = originalWhipConfig.enabled;
    config.whip.key = originalWhipConfig.key;
  });

  afterEach(() => {
    for (const sessionId of [...whipSessions.keys()]) {
      closeWhipSession(sessionId);
    }
  });

  test('is hidden when WHIP is disabled', async () => {
    config.whip.enabled = false;

    const response = await fetch(`${testsBaseUrl}/whip/${CHANNEL_ID}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHIP_KEY}` },
      body: buildOffer()
    });

    config.whip.enabled = true;

    expect(response.status).toBe(404);
  });

  test('rejects a missing bearer token', async () => {
    const response = await fetch(`${testsBaseUrl}/whip/${CHANNEL_ID}`, {
      method: 'POST',
      body: buildOffer()
    });

    expect(response.status).toBe(401);
  });

  test('rejects a wrong bearer token', async () => {
    const response = await fetch(`${testsBaseUrl}/whip/${CHANNEL_ID}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-key' },
      body: buildOffer()
    });

    expect(response.status).toBe(401);
  });

  test('rejects an invalid channel id', async () => {
    const response = await fetch(`${testsBaseUrl}/whip/not-a-channel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHIP_KEY}` },
      body: buildOffer()
    });

    expect(response.status).toBe(404);
  });

  test('rejects an unknown channel', async () => {
    const response = await fetch(`${testsBaseUrl}/whip/987654`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHIP_KEY}` },
      body: buildOffer()
    });

    expect(response.status).toBe(404);
  });

  test('rejects a body that is not an SDP offer', async () => {
    const response = await fetch(`${testsBaseUrl}/whip/${CHANNEL_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHIP_KEY}`,
        'Content-Type': 'application/sdp'
      },
      body: 'this is not sdp'
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toContain('offer');
  });

  test('creates a session with a valid offer', async () => {
    const response = await createSession();

    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toBe('application/sdp');
    expect(response.headers.get('location')).toMatch(
      new RegExp(`^/whip/${CHANNEL_ID}/[0-9a-f-]{36}$`)
    );

    const answer = sdpTransform.parse(await response.text());
    const audio = answer.media.find((media) => media.type === 'audio');
    const video = answer.media.find((media) => media.type === 'video');

    expect(answer.groups?.[0]?.mids).toBe('0 1');
    expect(audio?.direction).toBe('recvonly');
    expect(video?.direction).toBe('recvonly');
    expect(String(audio?.payloads)).toContain('96');
    expect(String(video?.payloads)).toContain('97');
    expect(audio?.setup).toBe('passive');
    expect(video?.setup).toBe('passive');
    expect(audio?.fingerprint?.type).toBe('sha-256');
    expect(audio?.iceUfrag).toBeTruthy();
    expect(audio?.iceUfrag).not.toBe('obsau1');
    expect(audio?.candidates?.length).toBeGreaterThan(0);
    expect(video?.candidates?.length).toBeGreaterThan(0);

    // the session materializes as an external stream with both tracks
    const externalStreams = runtime.getState().externalStreams;
    const streamIds = Object.keys(externalStreams);

    expect(streamIds.length).toBe(1);
    expect(externalStreams[Number(streamIds[0] ?? -1)]?.tracks).toEqual({
      audio: true,
      video: true
    });
  });

  test('accepts trickled candidates on the session', async () => {
    const created = await createSession();
    const location = created.headers.get('location')!;

    const fragment = [
      `a=ice-ufrag:obsau1`,
      'a=candidate:2 1 UDP 2130706432 192.168.1.11 50010 typ host',
      ''
    ].join('\r\n');

    const response = await fetch(`${testsBaseUrl}${location}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${WHIP_KEY}`,
        'Content-Type': 'application/trickle-ice-sdpfrag'
      },
      body: fragment
    });

    expect(response.status).toBe(204);
  });

  test('refuses an ICE restart attempt', async () => {
    const created = await createSession();
    const location = created.headers.get('location')!;

    const response = await fetch(`${testsBaseUrl}${location}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${WHIP_KEY}`,
        'Content-Type': 'application/trickle-ice-sdpfrag'
      },
      body: 'a=ice-ufrag:a-brand-new-one\r\n'
    });

    expect(response.status).toBe(400);
  });

  test('deletes a session and its external stream', async () => {
    const created = await createSession();
    const location = created.headers.get('location')!;

    expect(whipSessions.size).toBe(1);

    const response = await fetch(`${testsBaseUrl}${location}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${WHIP_KEY}` }
    });

    expect(response.status).toBe(204);
    expect(whipSessions.size).toBe(0);
    expect(Object.keys(runtime.getState().externalStreams)).toHaveLength(0);
  });

  test('returns 404 for an unknown session', async () => {
    await createSession();

    const response = await fetch(
      `${testsBaseUrl}/whip/${CHANNEL_ID}/00000000-0000-4000-8000-000000000000`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${WHIP_KEY}` }
      }
    );

    expect(response.status).toBe(404);
  });

  describe('with a user token', () => {
    // the runtime must sit on a real seeded voice channel because
    // user-token sessions go through the channel permission check, and the
    // mocked db only exists inside each test
    let userRuntime: VoiceRuntime;
    let userChannelId = 0;

    beforeEach(async () => {
      const [voiceChannel] = await db
        .select({ id: channelsTable.id })
        .from(channelsTable)
        .where(
          and(
            eq(channelsTable.type, ChannelType.VOICE),
            eq(channelsTable.isDm, false)
          )
        )
        .limit(1);

      userChannelId = voiceChannel?.id ?? CHANNEL_ID;

      userRuntime = new VoiceRuntime(userChannelId);
      createdRuntimes.push(userRuntime);
      await userRuntime.init();
    });

    const createUserSession = async () => {
      const loginResponse = await login('testowner', 'password123');
      const { token } = (await loginResponse.json()) as {
        token: string;
      };

      const response = await fetch(`${testsBaseUrl}/whip/${userChannelId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/sdp'
        },
        body: buildOffer()
      });

      return { response, token };
    };

    test('publishes as the user own screen share', async () => {
      const { response } = await createUserSession();

      expect(response.status).toBe(201);

      // the stream is registered as the user's SCREEN/SCREEN_AUDIO
      // producers, not as an external stream, so every client consumes it
      // like a regular browser screen share
      const remoteIds = userRuntime.getRemoteIds(-1);

      expect(remoteIds.remoteScreenIds).toHaveLength(1);
      expect(remoteIds.remoteScreenAudioIds).toHaveLength(1);
      expect(Object.keys(userRuntime.getState().externalStreams)).toHaveLength(
        0
      );

      const userId = remoteIds.remoteScreenIds[0];
      const screenProducer = userRuntime.getProducer(
        StreamKind.SCREEN,
        userId ?? -1
      );

      expect(screenProducer?.appData).toMatchObject({ source: 'whip' });
    });

    test('deleting the session removes the user screen producers', async () => {
      const { response } = await createUserSession();
      const location = response.headers.get('location')!;

      const deleteResponse = await fetch(`${testsBaseUrl}${location}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${WHIP_KEY}` }
      });

      expect(deleteResponse.status).toBe(204);

      const remoteIds = userRuntime.getRemoteIds(-1);

      expect(remoteIds.remoteScreenIds).toHaveLength(0);
      expect(remoteIds.remoteScreenAudioIds).toHaveLength(0);
    });

    test('rejects a token that is neither the key nor a user session', async () => {
      const response = await fetch(`${testsBaseUrl}/whip/${userChannelId}`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer not-a-jwt-and-not-the-key',
          'Content-Type': 'application/sdp'
        },
        body: buildOffer()
      });

      expect(response.status).toBe(401);
    });
  });
});
