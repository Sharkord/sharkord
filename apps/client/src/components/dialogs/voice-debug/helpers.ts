import type {
  TVoiceDebugSnapshot,
  TVoiceDebugStat
} from '@/helpers/voice-debug';

type TTone = 'ok' | 'warn' | 'bad' | 'muted';

const statsByType = (stats: TVoiceDebugStat[], type: string) =>
  stats.filter((stat) => stat.type === type);

const findStatById = (stats: TVoiceDebugStat[], id: unknown) =>
  typeof id === 'string' ? stats.find((stat) => stat.id === id) : undefined;

const getSelectedCandidatePair = (stats: TVoiceDebugStat[]) => {
  const transport = statsByType(stats, 'transport')[0];
  const selected = findStatById(stats, transport?.selectedCandidatePairId);

  if (selected) return selected;

  return statsByType(stats, 'candidate-pair').find(
    (pair) => pair.nominated === true && pair.state === 'succeeded'
  );
};

const describeCandidate = (candidate: TVoiceDebugStat | undefined) => {
  if (!candidate) return 'unknown';

  const address = candidate.address ?? candidate.ip ?? '?';
  const parts = [
    `${address}:${candidate.port ?? '?'}`,
    String(candidate.protocol ?? ''),
    String(candidate.candidateType ?? '')
  ];

  return parts.filter(Boolean).join(' ');
};

const flattenStats = (snapshot: TVoiceDebugSnapshot): TVoiceDebugStat[] => [
  ...snapshot.transports.flatMap((transport) => transport.stats),
  ...snapshot.producers.flatMap((producer) => producer.stats),
  ...snapshot.consumers.flatMap((consumer) => consumer.stats)
];

const getTransferredBytes = (stat: TVoiceDebugStat): number | undefined => {
  const value = stat.bytesSent ?? stat.bytesReceived;

  return typeof value === 'number' ? value : undefined;
};

const computeRates = (
  previous: TVoiceDebugSnapshot | undefined,
  current: TVoiceDebugSnapshot
): Record<string, number> => {
  if (!previous) return {};

  const elapsedMs = current.capturedAt - previous.capturedAt;

  if (elapsedMs <= 0) return {};

  const previousBytes = new Map<string, number>();

  flattenStats(previous).forEach((stat) => {
    const bytes = getTransferredBytes(stat);

    if (typeof stat.id === 'string' && bytes !== undefined) {
      previousBytes.set(stat.id, bytes);
    }
  });

  const rates: Record<string, number> = {};

  flattenStats(current).forEach((stat) => {
    const bytes = getTransferredBytes(stat);

    if (typeof stat.id !== 'string' || bytes === undefined) return;

    const before = previousBytes.get(stat.id);

    if (before === undefined || bytes < before) return;

    rates[stat.id] = ((bytes - before) * 8000) / elapsedMs;
  });

  return rates;
};

const formatBitrate = (bitsPerSecond: number | undefined) => {
  if (bitsPerSecond === undefined) return '–';
  if (bitsPerSecond < 1000) return `${Math.round(bitsPerSecond)} bps`;
  if (bitsPerSecond < 1_000_000)
    return `${(bitsPerSecond / 1000).toFixed(1)} kbps`;

  return `${(bitsPerSecond / 1_000_000).toFixed(2)} Mbps`;
};

const formatBytes = (value: unknown) => {
  if (typeof value !== 'number') return '–';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

const formatSeconds = (value: unknown) =>
  typeof value === 'number' ? `${Math.round(value * 1000)} ms` : '–';

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null) return '–';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }

  return String(value);
};

const formatTime = (at: number) => {
  const date = new Date(at);

  return `${date.toLocaleTimeString()}.${String(date.getMilliseconds()).padStart(3, '0')}`;
};

const CONNECTION_STATE_TONES: Record<string, TTone> = {
  connected: 'ok',
  completed: 'ok',
  succeeded: 'ok',
  connecting: 'warn',
  checking: 'warn',
  new: 'muted',
  disconnected: 'bad',
  failed: 'bad',
  closed: 'bad'
};

const getStateTone = (state: unknown): TTone =>
  CONNECTION_STATE_TONES[String(state)] ?? 'muted';

const getScalarEntries = (stat: TVoiceDebugStat) =>
  Object.entries(stat).filter(
    ([, value]) => value === null || typeof value !== 'object'
  );

export {
  computeRates,
  describeCandidate,
  findStatById,
  formatBitrate,
  formatBytes,
  formatSeconds,
  formatTime,
  formatValue,
  getScalarEntries,
  getSelectedCandidatePair,
  getStateTone,
  statsByType
};
export type { TTone };
