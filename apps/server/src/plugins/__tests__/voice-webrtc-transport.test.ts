import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test';
import { pluginManager } from '..';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { config } from '../../config';
import { VoiceRuntime } from '../../runtimes/voice';
import {
  closePluginWebRtcTransports,
  createPluginWebRtcTransport,
  getPluginWebRtcTransportCount
} from '../actions/create-plugin-webrtc-transport';

// the transport is real, on the server's webRtcServer, but no peer connects
// to it from here, so ICE/DTLS and media actually arriving stay uncovered
const CHANNEL_ID = 9501;

let runtime: VoiceRuntime | undefined;

const startRuntime = async () => {
  runtime = new VoiceRuntime(CHANNEL_ID);

  await runtime.init();
};

beforeAll(loadMockedPlugins);
beforeEach(resetPluginMocks);

afterEach(async () => {
  closePluginWebRtcTransports('plugin-a');
  closePluginWebRtcTransports('plugin-b');

  await runtime?.destroy();
  runtime = undefined;
});

describe('createPluginWebRtcTransport', () => {
  test('should create a transport on the shared webRtcServer port', async () => {
    await startRuntime();

    const transport = await createPluginWebRtcTransport('plugin-a', CHANNEL_ID);

    expect(transport.closed).toBe(false);
    expect(transport.iceCandidates.length).toBeGreaterThan(0);

    for (const candidate of transport.iceCandidates) {
      expect(candidate.port).toBe(+config.webRtc.port);
    }

    expect(getPluginWebRtcTransportCount('plugin-a')).toBe(1);
  });

  test('should refuse a channel with no voice runtime', async () => {
    await expect(createPluginWebRtcTransport('plugin-a', 9999)).rejects.toThrow(
      'Voice runtime not found'
    );

    expect(getPluginWebRtcTransportCount('plugin-a')).toBe(0);
  });

  test('should stop tracking a transport the plugin closed', async () => {
    await startRuntime();

    const transport = await createPluginWebRtcTransport('plugin-a', CHANNEL_ID);

    transport.close();

    expect(getPluginWebRtcTransportCount('plugin-a')).toBe(0);
  });

  test('should stop tracking a transport when the runtime closes', async () => {
    await startRuntime();

    const transport = await createPluginWebRtcTransport('plugin-a', CHANNEL_ID);

    await runtime!.destroy();
    runtime = undefined;

    expect(transport.closed).toBe(true);
    expect(getPluginWebRtcTransportCount('plugin-a')).toBe(0);
  });

  test('should close what a plugin left open when the manager unloads it', async () => {
    await pluginManager.load('plugin-b');
    await startRuntime();

    const transport = await createPluginWebRtcTransport('plugin-b', CHANNEL_ID);

    await pluginManager.unload('plugin-b');

    expect(transport.closed).toBe(true);
    expect(getPluginWebRtcTransportCount('plugin-b')).toBe(0);
  });

  test('should leave another plugin alone when one unloads', async () => {
    await startRuntime();

    const transport = await createPluginWebRtcTransport('plugin-b', CHANNEL_ID);

    closePluginWebRtcTransports('plugin-a');

    expect(transport.closed).toBe(false);
    expect(getPluginWebRtcTransportCount('plugin-b')).toBe(1);
  });
});
