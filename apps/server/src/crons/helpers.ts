import { readFile } from 'fs/promises';
import type { types } from 'mediasoup';
import { VoiceRuntime } from '../runtimes/voice';
import { mediaSoupWorker, WORKER_MEMORY_IS_PEAK } from '../utils/mediasoup';

const getWorkerUsage = async () => {
  if (!mediaSoupWorker || mediaSoupWorker.closed) return null;

  try {
    return await mediaSoupWorker.getResourceUsage();
  } catch {
    return null;
  }
};

const readResidentMemory = async (pid: number) => {
  try {
    const status = await readFile(`/proc/${pid}/status`, 'utf8');
    const match = /^VmRSS:\s+(\d+) kB$/m.exec(status);

    if (!match) return null;

    return Number(match[1]) * 1024;
  } catch {
    return null;
  }
};

const getWorkerMemory = async (usage: types.WorkerResourceUsage | null) => {
  if (!usage || !mediaSoupWorker) return null;

  if (WORKER_MEMORY_IS_PEAK) return usage.ru_maxrss * 1024;

  return readResidentMemory(mediaSoupWorker.pid);
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

export {
  getVoiceLoad,
  getWorkerMemory,
  getWorkerUsage,
  readResidentMemory,
  toPercent
};
