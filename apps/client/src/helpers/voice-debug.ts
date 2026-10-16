import type {
  Consumer,
  Producer,
  RtpCapabilities,
  Transport
} from 'mediasoup-client/types';

// the buffer records whether or not the debug dialog is open, because the interesting
// events are the ones that happened before anyone thought to look
const MAX_EVENTS = 500;
const MAX_EVENT_DATA_LENGTH = 2000;

type TVoiceDebugEventCategory = 'voice' | 'warn' | 'error' | 'ws';

type TVoiceDebugEvent = {
  id: number;
  at: number;
  category: TVoiceDebugEventCategory;
  message: string;
  data?: string;
};

type TVoiceDebugStat = Record<string, unknown>;

type TVoiceDebugTrack = {
  id: string;
  kind: string;
  label: string;
  enabled: boolean;
  muted: boolean;
  readyState: string;
  settings: MediaTrackSettings;
};

type TVoiceDebugTransport = {
  role: 'producer' | 'consumer';
  id: string;
  direction: string;
  closed: boolean;
  connectionState: string;
  stats: TVoiceDebugStat[];
};

type TVoiceDebugProducer = {
  kind: string;
  id: string;
  mediaKind: string;
  closed: boolean;
  paused: boolean;
  maxSpatialLayer?: number;
  codec?: string;
  encodings: unknown[];
  track?: TVoiceDebugTrack;
  stats: TVoiceDebugStat[];
};

type TVoiceDebugConsumer = {
  remoteId: number;
  kind: string;
  id: string;
  producerId: string;
  mediaKind: string;
  closed: boolean;
  paused: boolean;
  codec?: string;
  track?: TVoiceDebugTrack;
  stats: TVoiceDebugStat[];
};

type TVoiceDebugSnapshot = {
  capturedAt: number;
  hasSession: boolean;
  userAgent: string;
  transports: TVoiceDebugTransport[];
  producers: TVoiceDebugProducer[];
  consumers: TVoiceDebugConsumer[];
  routerCodecs: string[];
  deviceCodecs: string[];
  collectErrors: string[];
};

type TVoiceDebugSource = () => {
  producerTransport?: Transport;
  consumerTransport?: Transport;
  producers: { kind: string; producer?: Producer }[];
  consumers: { remoteId: number; kind: string; consumer: Consumer }[];
  routerRtpCapabilities?: RtpCapabilities | null;
  deviceRtpCapabilities?: RtpCapabilities | null;
};

let events: TVoiceDebugEvent[] = [];
let nextEventId = 0;
let source: TVoiceDebugSource | undefined;

// producers, transports and media streams are circular and enormous, so anything that is
// not a plain object is reduced to its class name
const serialize = (value: unknown): string | undefined => {
  if (value === undefined) return undefined;

  const seen = new WeakSet<object>();

  let result: string | undefined;

  try {
    result = JSON.stringify(value, (_key, entry: unknown) => {
      if (typeof entry !== 'object' || entry === null) return entry;

      if (seen.has(entry)) return '[circular]';

      seen.add(entry);

      const name = entry.constructor?.name;

      if (name && name !== 'Object' && name !== 'Array') return `[${name}]`;

      return entry;
    });
  } catch {
    return '[unserializable]';
  }

  if (result === undefined) return undefined;

  return result.length > MAX_EVENT_DATA_LENGTH
    ? `${result.slice(0, MAX_EVENT_DATA_LENGTH)}…`
    : result;
};

const pushVoiceDebugEvent = (
  category: TVoiceDebugEventCategory,
  message: string,
  data?: unknown
): void => {
  events.push({
    id: nextEventId++,
    at: Date.now(),
    category,
    message,
    data: serialize(data)
  });

  if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
};

const getVoiceDebugEvents = (): TVoiceDebugEvent[] => events;

const clearVoiceDebugEvents = (): void => {
  events = [];
};

const registerVoiceDebugSource = (next: TVoiceDebugSource): (() => void) => {
  source = next;

  return () => {
    if (source === next) source = undefined;
  };
};

const describeTrack = (
  track: MediaStreamTrack | null | undefined
): TVoiceDebugTrack | undefined => {
  if (!track) return undefined;

  return {
    id: track.id,
    kind: track.kind,
    label: track.label,
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
    settings: track.getSettings()
  };
};

// a closed transport throws here, which is exactly the moment the dialog gets opened, so
// every read is isolated and its failure reported instead of losing the whole snapshot
const readStats = async (
  read: () => Promise<RTCStatsReport>,
  label: string,
  collectErrors: string[]
): Promise<TVoiceDebugStat[]> => {
  try {
    return Array.from((await read()).values()) as TVoiceDebugStat[];
  } catch (error) {
    collectErrors.push(`${label}: ${String(error)}`);

    return [];
  }
};

const describeTransport = async (
  role: 'producer' | 'consumer',
  transport: Transport,
  collectErrors: string[]
): Promise<TVoiceDebugTransport> => ({
  role,
  id: transport.id,
  direction: transport.direction,
  closed: transport.closed,
  connectionState: transport.connectionState,
  stats: transport.closed
    ? []
    : await readStats(
        () => transport.getStats(),
        `${role} transport stats`,
        collectErrors
      )
});

const describeProducer = async (
  kind: string,
  producer: Producer,
  collectErrors: string[]
): Promise<TVoiceDebugProducer> => ({
  kind,
  id: producer.id,
  mediaKind: producer.kind,
  closed: producer.closed,
  paused: producer.paused,
  maxSpatialLayer: producer.maxSpatialLayer,
  codec: producer.rtpParameters?.codecs?.[0]?.mimeType,
  encodings: producer.rtpParameters?.encodings ?? [],
  track: describeTrack(producer.track),
  stats: producer.closed
    ? []
    : await readStats(
        () => producer.getStats(),
        `${kind} producer stats`,
        collectErrors
      )
});

const describeConsumer = async (
  remoteId: number,
  kind: string,
  consumer: Consumer,
  collectErrors: string[]
): Promise<TVoiceDebugConsumer> => ({
  remoteId,
  kind,
  id: consumer.id,
  producerId: consumer.producerId,
  mediaKind: consumer.kind,
  closed: consumer.closed,
  paused: consumer.paused,
  codec: consumer.rtpParameters?.codecs?.[0]?.mimeType,
  track: describeTrack(consumer.track),
  stats: consumer.closed
    ? []
    : await readStats(
        () => consumer.getStats(),
        `consumer ${remoteId}/${kind} stats`,
        collectErrors
      )
});

const getCodecNames = (capabilities: RtpCapabilities | null | undefined) =>
  capabilities?.codecs?.map((codec) => codec.mimeType) ?? [];

const collectVoiceDebugSnapshot = async (): Promise<TVoiceDebugSnapshot> => {
  const collectErrors: string[] = [];
  const current = source?.();

  const [transports, producers, consumers] = await Promise.all([
    Promise.all(
      [
        current?.producerTransport &&
          describeTransport(
            'producer',
            current.producerTransport,
            collectErrors
          ),
        current?.consumerTransport &&
          describeTransport(
            'consumer',
            current.consumerTransport,
            collectErrors
          )
      ].filter((entry): entry is Promise<TVoiceDebugTransport> => !!entry)
    ),
    Promise.all(
      (current?.producers ?? [])
        .filter(
          (entry): entry is { kind: string; producer: Producer } =>
            !!entry.producer
        )
        .map((entry) =>
          describeProducer(entry.kind, entry.producer, collectErrors)
        )
    ),
    Promise.all(
      (current?.consumers ?? []).map((entry) =>
        describeConsumer(
          entry.remoteId,
          entry.kind,
          entry.consumer,
          collectErrors
        )
      )
    )
  ]);

  return {
    capturedAt: Date.now(),
    hasSession: !!current,
    userAgent: navigator.userAgent,
    transports,
    producers,
    consumers,
    routerCodecs: getCodecNames(current?.routerRtpCapabilities),
    deviceCodecs: getCodecNames(current?.deviceRtpCapabilities),
    collectErrors
  };
};

// recorded from module load rather than from a hook: a tab that was hidden or offline when
// the call died is the explanation, and by the time anything voice related mounts the
// moment has passed. both are cheap and fire rarely
window.addEventListener('online', () => {
  pushVoiceDebugEvent('ws', 'page: network online');
});

window.addEventListener('offline', () => {
  pushVoiceDebugEvent('ws', 'page: network offline');
});

document.addEventListener('visibilitychange', () => {
  pushVoiceDebugEvent('ws', 'page: visibility changed', {
    state: document.visibilityState
  });
});

export {
  clearVoiceDebugEvents,
  collectVoiceDebugSnapshot,
  getVoiceDebugEvents,
  pushVoiceDebugEvent,
  registerVoiceDebugSource
};
export type {
  TVoiceDebugConsumer,
  TVoiceDebugEvent,
  TVoiceDebugProducer,
  TVoiceDebugSnapshot,
  TVoiceDebugStat,
  TVoiceDebugTransport
};
