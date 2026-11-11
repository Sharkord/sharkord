import type { AppData, WebRtcTransport } from 'mediasoup/types';
import { getPluginVoiceRuntime } from '../../helpers/get-plugin-voice-runtime';

const transportsByPlugin = new Map<string, Set<WebRtcTransport<AppData>>>();

const createPluginWebRtcTransport = async (
  pluginId: string,
  channelId: number
): Promise<WebRtcTransport<AppData>> => {
  const runtime = getPluginVoiceRuntime(channelId);
  const { transport } = await runtime.createTransport();

  const transports = transportsByPlugin.get(pluginId) ?? new Set();

  transports.add(transport);
  transportsByPlugin.set(pluginId, transports);

  transport.observer.on('close', () => {
    transportsByPlugin.get(pluginId)?.delete(transport);
  });

  return transport;
};

const closePluginWebRtcTransports = (pluginId: string) => {
  const transports = transportsByPlugin.get(pluginId);

  if (!transports) return;

  for (const transport of Array.from(transports)) transport.close();

  transportsByPlugin.delete(pluginId);
};

const getPluginWebRtcTransportCount = (pluginId: string) =>
  transportsByPlugin.get(pluginId)?.size ?? 0;

export {
  closePluginWebRtcTransports,
  createPluginWebRtcTransport,
  getPluginWebRtcTransportCount
};
