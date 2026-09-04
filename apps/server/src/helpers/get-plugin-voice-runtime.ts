import { VoiceRuntime } from '../runtimes/voice';

const getPluginVoiceRuntime = (channelId: number) => {
  const runtime = VoiceRuntime.findById(channelId);

  if (!runtime) {
    throw new Error(`Voice runtime not found for channel ID ${channelId}`);
  }

  return runtime;
};

export { getPluginVoiceRuntime };
