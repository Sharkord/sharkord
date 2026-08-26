import { createContext, useContext, useEffect } from 'react';
import type { TransportStatsData } from './hooks/use-transport-stats';

const DEFAULT_STATS: TransportStatsData = {
  producer: null,
  consumer: null,
  screenShare: null,
  totalBytesReceived: 0,
  totalBytesSent: 0,
  currentBitrateSent: 0,
  currentBitrateReceived: 0
};

type TVoiceStatsContext = {
  stats: TransportStatsData;
  subscribe: () => () => void;
};

const VoiceStatsContext = createContext<TVoiceStatsContext>({
  stats: DEFAULT_STATS,
  subscribe: () => () => {}
});

// subscribing is what starts the polling, so a component that never reads the
// stats never pays for them
const useVoiceStats = () => {
  const { stats, subscribe } = useContext(VoiceStatsContext);

  useEffect(() => subscribe(), [subscribe]);

  return stats;
};

export { useVoiceStats, VoiceStatsContext };
