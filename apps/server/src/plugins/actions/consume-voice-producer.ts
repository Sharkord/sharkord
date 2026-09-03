import type {
  TConsumeOptions,
  TVoiceConsumerHandle
} from '@sharkord/plugin-sdk';
import { getPluginVoiceRuntime } from '../../helpers/get-plugin-voice-runtime';
import type { ScopedLogger } from '../plugin-logger';

const handlesByPlugin = new Map<string, Set<TVoiceConsumerHandle>>();

const consumeVoiceProducer = async (
  pluginId: string,
  scopedLogger: ScopedLogger,
  options: TConsumeOptions
): Promise<TVoiceConsumerHandle> => {
  const runtime = getPluginVoiceRuntime(options.channelId);
  const producer = runtime.getProducer(options.kind, options.userId);

  if (!producer) {
    throw new Error(
      `User ${options.userId} has no ${options.kind} producer in channel ${options.channelId}`
    );
  }

  const router = runtime.getRouter();
  const { rtpCapabilities } = router;

  if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
    throw new Error(
      `The router cannot consume the ${options.kind} producer of user ${options.userId}`
    );
  }

  const transport = await router.createDirectTransport();
  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities,
    appData: { pluginId }
  });

  consumer.on('rtp', options.onRtp);

  const label = `${options.kind} of user ${options.userId} in channel ${options.channelId}`;

  // reading someone's voice is worth a line an admin can find later
  scopedLogger.log(`Started consuming the ${label}`);

  const handle: TVoiceConsumerHandle = {
    producerId: producer.id,
    rtpParameters: consumer.rtpParameters,
    requestKeyFrame: () => consumer.requestKeyFrame(),
    close: () => {
      handlesByPlugin.get(pluginId)?.delete(handle);

      if (transport.closed) return;

      // closing the transport closes the consumer under it
      transport.close();

      scopedLogger.log(`Stopped consuming the ${label}`);
    }
  };

  // the producer ending is the normal way this stops, not an error
  consumer.on('producerclose', handle.close);

  const handles = handlesByPlugin.get(pluginId) ?? new Set();

  handles.add(handle);
  handlesByPlugin.set(pluginId, handles);

  return handle;
};

const closePluginVoiceConsumers = (pluginId: string) => {
  const handles = handlesByPlugin.get(pluginId);

  if (!handles) return;

  for (const handle of Array.from(handles)) handle.close();

  handlesByPlugin.delete(pluginId);
};

const getPluginVoiceConsumerCount = (pluginId: string) =>
  handlesByPlugin.get(pluginId)?.size ?? 0;

export {
  closePluginVoiceConsumers,
  consumeVoiceProducer,
  getPluginVoiceConsumerCount
};
