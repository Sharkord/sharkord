import type { Transport } from 'mediasoup-client/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { logVoice } from '../helpers';

export type TransportStats = {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  packetsLost: number;
  rtt: number;
  jitter: number;
  timestamp: number;
};

export type TransportStatsData = {
  producer: TransportStats | null;
  consumer: TransportStats | null;
  totalBytesReceived: number;
  totalBytesSent: number;
  currentBitrateSent: number;
  currentBitrateReceived: number;
  isMonitoring: boolean;
};

const useTransportStats = () => {
  const [stats, setStats] = useState<TransportStatsData>({
    producer: null,
    consumer: null,
    totalBytesReceived: 0,
    totalBytesSent: 0,
    currentBitrateSent: 0,
    currentBitrateReceived: 0,
    isMonitoring: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const producerTransportRef = useRef<Transport | null>(null);
  const consumerTransportRef = useRef<Transport | null>(null);
  const previousStatsRef = useRef<{
    producer: TransportStats | null;
    consumer: TransportStats | null;
  }>({
    producer: null,
    consumer: null
  });

  const parseTransportStats = useCallback(
    (
      statsReport: RTCStatsReport,
      isProducer: boolean
    ): TransportStats | null => {
      let bytesReceived = 0;
      let bytesSent = 0;
      let packetsReceived = 0;
      let packetsSent = 0;
      let packetsLost = 0;
      let rtt = 0;
      let jitter = 0;

      for (const [, stat] of statsReport) {
        if (stat.type === 'outbound-rtp') {
          // only count outbound stats for producer transports
          if (isProducer) {
            bytesSent += stat.bytesSent || 0;
            packetsSent += stat.packetsSent || 0;
          }
        } else if (stat.type === 'inbound-rtp') {
          // only count inbound stats for consumer transports
          if (!isProducer) {
            bytesReceived += stat.bytesReceived || 0;
            packetsReceived += stat.packetsReceived || 0;
            packetsLost += stat.packetsLost || 0;
            jitter += stat.jitter || 0;
          }
        } else if (
          stat.type === 'candidate-pair' &&
          stat.state === 'succeeded'
        ) {
          rtt = stat.currentRoundTripTime * 1000 || 0; // convert to ms
        }
      }

      return {
        bytesReceived,
        bytesSent,
        packetsReceived,
        packetsSent,
        packetsLost,
        rtt,
        jitter,
        timestamp: Date.now()
      };
    },
    []
  );

  const collectStats = useCallback(async () => {
    if (!producerTransportRef.current && !consumerTransportRef.current) {
      return;
    }

    try {
      let producerStats: TransportStats | null = null;
      let consumerStats: TransportStats | null = null;

      if (producerTransportRef.current) {
        const producerStatsReport =
          await producerTransportRef.current.getStats();

        producerStats = parseTransportStats(producerStatsReport, true);
      }

      if (consumerTransportRef.current) {
        const consumerStatsReport =
          await consumerTransportRef.current.getStats();

        consumerStats = parseTransportStats(consumerStatsReport, false);
      }

      const previousProducer = previousStatsRef.current.producer;
      const previousConsumer = previousStatsRef.current.consumer;

      const bytesReceivedDelta =
        (consumerStats?.bytesReceived || 0) -
        (previousConsumer?.bytesReceived || 0);

      const bytesSentDelta =
        (producerStats?.bytesSent || 0) - (previousProducer?.bytesSent || 0);

      const timeDelta =
        previousProducer?.timestamp || previousConsumer?.timestamp
          ? (Date.now() -
              (previousProducer?.timestamp ||
                previousConsumer?.timestamp ||
                0)) /
            1000
          : 1;

      const currentBitrateSent = timeDelta > 0 ? bytesSentDelta / timeDelta : 0;
      const currentBitrateReceived =
        timeDelta > 0 ? bytesReceivedDelta / timeDelta : 0;

      setStats((prev) => ({
        producer: producerStats,
        consumer: consumerStats,
        totalBytesReceived: prev.totalBytesReceived + bytesReceivedDelta,
        totalBytesSent: prev.totalBytesSent + bytesSentDelta,
        currentBitrateSent,
        currentBitrateReceived,
        isMonitoring: true
      }));

      previousStatsRef.current = {
        producer: producerStats,
        consumer: consumerStats
      };
    } catch (error) {
      logVoice('Error collecting transport stats', { error });
    }
  }, [parseTransportStats]);

  const startMonitoring = useCallback(
    (
      producerTransport?: Transport | null,
      consumerTransport?: Transport | null,
      intervalMs: number = 1000
    ) => {
      producerTransportRef.current = producerTransport || null;
      consumerTransportRef.current = consumerTransport || null;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (producerTransport || consumerTransport) {
        intervalRef.current = setInterval(collectStats, intervalMs);

        collectStats();
      }
    },
    [collectStats]
  );

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setStats((prev) => ({
      ...prev,
      isMonitoring: false
    }));

    logVoice('Stopped transport stats monitoring');
  }, []);

  const resetStats = useCallback(() => {
    setStats({
      producer: null,
      consumer: null,
      totalBytesReceived: 0,
      totalBytesSent: 0,
      currentBitrateSent: 0,
      currentBitrateReceived: 0,
      isMonitoring: false
    });

    previousStatsRef.current = {
      producer: null,
      consumer: null
    };

    logVoice('Transport stats reset');
  }, []);

  const printStats = useCallback(() => {
    logVoice('Current Transport Stats:', { stats });
  }, [stats]);

  useEffect(() => {
    window.printVoiceStats = printStats;

    return () => {
      delete window.printVoiceStats;
    };
  }, [printStats]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    stats,
    startMonitoring,
    stopMonitoring,
    resetStats
  };
};

export { useTransportStats };
