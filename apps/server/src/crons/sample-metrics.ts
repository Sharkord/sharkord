import os from 'os';
import si from 'systeminformation';
import { getSettings } from '../db/queries/server';
import {
  startEventLoopMonitor,
  stopEventLoopMonitor,
  takeEventLoopLag
} from '../utils/event-loop-lag';
import { addMetricsSample } from '../utils/metrics-samples';
import { getOnlineUserIds } from '../utils/wss';
import { getVoiceLoad, getWorkerUsage, toPercent } from './helpers';

type TCpuTimes = {
  at: number;
  process: number;
  worker: number | null;
};

let previous: TCpuTimes | undefined;

const sampleMetrics = async () => {
  const { metricsEnabled } = await getSettings();

  if (!metricsEnabled) {
    previous = undefined;

    stopEventLoopMonitor();

    return;
  }

  startEventLoopMonitor();

  const [workerUsage, load, voiceLoad] = await Promise.all([
    getWorkerUsage(),
    si.currentLoad(),
    getVoiceLoad()
  ]);

  const { user, system } = process.cpuUsage();
  const { rss } = process.memoryUsage();

  const current: TCpuTimes = {
    at: performance.now(),
    process: user + system,
    worker: workerUsage
      ? (workerUsage.ru_utime + workerUsage.ru_stime) * 1000
      : null
  };

  const last = previous;

  previous = current;

  if (!last) return;

  const elapsedMicros =
    (current.at - last.at) * 1000 * os.availableParallelism();

  let workerCpu: number | null = null;

  if (current.worker !== null && last.worker !== null) {
    workerCpu = toPercent(current.worker - last.worker, elapsedMicros);
  }

  addMetricsSample({
    timestamp: Date.now(),
    cpu: toPercent(current.process - last.process, elapsedMicros),
    memory: rss,
    systemCpu: load.currentLoad,
    systemMemoryUsed: os.totalmem() - os.freemem(),
    systemMemoryTotal: os.totalmem(),
    workerCpu,
    workerMemory: workerUsage ? workerUsage.ru_maxrss * 1024 : null,
    onlineUsers: getOnlineUserIds().length,
    ...voiceLoad,
    eventLoopLag: takeEventLoopLag()
  });
};

export { sampleMetrics };
