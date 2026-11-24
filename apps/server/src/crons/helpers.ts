import { VoiceRuntime } from '../runtimes/voice';
import { mediaSoupWorker } from '../utils/mediasoup';

const getWorkerUsage = async () => {
  if (!mediaSoupWorker || mediaSoupWorker.closed) return null;

  try {
    return await mediaSoupWorker.getResourceUsage();
  } catch {
    return null;
  }
};

const getVoiceLoad = async () => {
  const runtimes = VoiceRuntime.getAll();
  const bitrates = await Promise.all(
    runtimes.map((runtime) => runtime.getTrafficBitrates())
  );

  let voiceUsers = 0;
  let voiceProducers = 0;
  let voiceConsumers = 0;
  let receivedBits = 0;
  let sentBits = 0;

  for (const runtime of runtimes) {
    const { users } = runtime.getState();
    const { producers, consumers } = runtime.getStreamCounts();

    voiceUsers += users.length;
    voiceProducers += producers;
    voiceConsumers += consumers;
  }

  for (const { received, sent } of bitrates) {
    receivedBits += received;
    sentBits += sent;
  }

  return {
    voiceUsers,
    voiceProducers,
    voiceConsumers,
    voiceRx: receivedBits / 8,
    voiceTx: sentBits / 8
  };
};

const toPercent = (usedMicros: number, elapsedMicros: number) =>
  Math.min(100, (usedMicros / elapsedMicros) * 100);

export { getVoiceLoad, getWorkerUsage, toPercent };
