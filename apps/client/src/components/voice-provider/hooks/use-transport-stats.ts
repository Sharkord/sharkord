import { logVoice } from '@/helpers/browser-logger';
import type { AppData, Producer, Transport } from 'mediasoup-client/types';
import { useCallback, useEffect, useRef, useState } from 'react';

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

export type ScreenShareStats = {
  codec: string;
  encoderImplementation: string;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  packetsSent: number;
  bytesSent: number;
  keyFramesEncoded: number;
  framesEncoded: number;
  qualityLimitationReason: string;
  timestamp: number;
};

export type TransportStatsData = {
  producer: TransportStats | null;
  consumer: TransportStats | null;
  screenShare: ScreenShareStats | null;
  totalBytesReceived: number;
  totalBytesSent: number;
  currentBitrateSent: number;
  currentBitrateReceived: number;
  averageBitrateSent: number;
  averageBitrateReceived: number;
  isMonitoring: boolean;
};

const SMOOTHING_WINDOW = 5; // Number of samples for moving average

const useTransportStats = () => {
  const [stats, setStats] = useState<TransportStatsData>({
    producer: null,
    consumer: null,
    screenShare: null,
    totalBytesReceived: 0,
    totalBytesSent: 0,
    currentBitrateSent: 0,
    currentBitrateReceived: 0,
    averageBitrateSent: 0,
    averageBitrateReceived: 0,
    isMonitoring: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const producerTransportRef = useRef<Transport | null>(null);
  const consumerTransportRef = useRef<Transport | null>(null);
  const screenShareProducerRef = useRef<Producer<AppData> | null>(null);
  const previousStatsRef = useRef<{
    producer: TransportStats | null;
    consumer: TransportStats | null;
  }>({
    producer: null,
    consumer: null
  });
  const previousScreenShareBytesRef = useRef<{
    bytesSent: number;
    timestamp: number;
  } | null>(null);

  // Rolling windows for smoothing bitrate
  const bitrateSentHistoryRef = useRef<number[]>([]);
  const bitrateReceivedHistoryRef = useRef<number[]>([]);

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

      for (const stat of statsReport.values()) {
        if (stat.type === 'outbound-rtp' && isProducer) {
          bytesSent += stat.bytesSent || 0;
          packetsSent += stat.packetsSent || 0;
        } else if (stat.type === 'inbound-rtp' && !isProducer) {
          bytesReceived += stat.bytesReceived || 0;
          packetsReceived += stat.packetsReceived || 0;
          packetsLost += stat.packetsLost || 0;
          jitter += stat.jitter || 0;
        } else if (
          stat.type === 'candidate-pair' &&
          stat.state === 'succeeded'
        ) {
          rtt = (stat.currentRoundTripTime || 0) * 1000;
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

  const parseScreenShareStats = useCallback(
    (statsReport: RTCStatsReport): Omit<ScreenShareStats, 'bitrate'> | null => {
      let codec = '';
      let encoderImplementation = '';
      let width = 0;
      let height = 0;
      let frameRate = 0;
      let packetsSent = 0;
      let bytesSent = 0;
      let keyFramesEncoded = 0;
      let framesEncoded = 0;
      let qualityLimitationReason = 'none';

      const codecMap = new Map<string, string>();

      for (const stat of statsReport.values()) {
        if (stat.type === 'codec') {
          codecMap.set(stat.id, stat.mimeType || '');
        }
      }

      for (const stat of statsReport.values()) {
        if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
          bytesSent = stat.bytesSent || 0;
          packetsSent = stat.packetsSent || 0;
          frameRate = stat.framesPerSecond || 0;
          width = stat.frameWidth || 0;
          height = stat.frameHeight || 0;
          keyFramesEncoded = stat.keyFramesEncoded || 0;
          framesEncoded = stat.framesEncoded || 0;
          qualityLimitationReason = stat.qualityLimitationReason || 'none';
          encoderImplementation = stat.encoderImplementation || '';

          if (stat.codecId && codecMap.has(stat.codecId)) {
            codec = codecMap.get(stat.codecId)!;
          }
        }
      }

      if (!width && !height && !bytesSent) {
        return null;
      }

      return {
        codec,
        encoderImplementation,
        width,
        height,
        frameRate,
        packetsSent,
        bytesSent,
        keyFramesEncoded,
        framesEncoded,
        qualityLimitationReason,
        timestamp: Date.now()
      };
    },
    []
  );

  const collectStats = useCallback(async () => {
    if (!producerTransportRef.current && !consumerTransportRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setStats((prev) => ({
        ...prev,
        isMonitoring: false
      }));

      logVoice('Stopped transport stats monitoring (transports closed)');
      return;
    }

    try {
      let producerStats: TransportStats | null = null;
      let consumerStats: TransportStats | null = null;

      if (producerTransportRef.current) {
        try {
          const producerStatsReport =
            await producerTransportRef.current.getStats();

          producerStats = parseTransportStats(producerStatsReport, true);
        } catch {
          producerTransportRef.current = null;
        }
      }

      if (consumerTransportRef.current) {
        try {
          const consumerStatsReport =
            await consumerTransportRef.current.getStats();

          consumerStats = parseTransportStats(consumerStatsReport, false);
        } catch {
          consumerTransportRef.current = null;
        }
      }

      let screenShareStatsResult: ScreenShareStats | null = null;

      if (
        screenShareProducerRef.current &&
        !screenShareProducerRef.current.closed
      ) {
        try {
          const screenShareReport =
            await screenShareProducerRef.current.getStats();

          const parsed = parseScreenShareStats(screenShareReport);

          if (parsed) {
            let screenShareBitrate = 0;
            const prev = previousScreenShareBytesRef.current;

            if (prev && parsed.bytesSent > prev.bytesSent) {
              const timeDelta = (parsed.timestamp - prev.timestamp) / 1000;

              if (timeDelta > 0) {
                screenShareBitrate =
                  (parsed.bytesSent - prev.bytesSent) / timeDelta;
              }
            }

            previousScreenShareBytesRef.current = {
              bytesSent: parsed.bytesSent,
              timestamp: parsed.timestamp
            };

            screenShareStatsResult = {
              ...parsed,
              bitrate: screenShareBitrate
            };
          }
        } catch {
          screenShareProducerRef.current = null;
          previousScreenShareBytesRef.current = null;
        }
      } else {
        previousScreenShareBytesRef.current = null;
      }

      if (!producerTransportRef.current && !consumerTransportRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        setStats((prev) => ({
          ...prev,
          isMonitoring: false
        }));

        logVoice('Stopped transport stats monitoring (all transports closed)');
        return;
      }

      const previousProducer = previousStatsRef.current.producer;
      const previousConsumer = previousStatsRef.current.consumer;

      const bytesReceivedDelta =
        consumerStats && previousConsumer
          ? consumerStats.bytesReceived - previousConsumer.bytesReceived
          : 0;

      const bytesSentDelta =
        producerStats && previousProducer
          ? producerStats.bytesSent - previousProducer.bytesSent
          : 0;

      let currentBitrateSent = 0;
      let currentBitrateReceived = 0;

      if (producerStats && previousProducer && bytesSentDelta > 0) {
        const timeDeltaSent =
          (producerStats.timestamp - previousProducer.timestamp) / 1000;

        if (timeDeltaSent > 0) {
          currentBitrateSent = bytesSentDelta / timeDeltaSent;
        }
      }

      if (consumerStats && previousConsumer && bytesReceivedDelta > 0) {
        const timeDeltaReceived =
          (consumerStats.timestamp - previousConsumer.timestamp) / 1000;

        if (timeDeltaReceived > 0) {
          currentBitrateReceived = bytesReceivedDelta / timeDeltaReceived;
        }
      }

      if (currentBitrateSent > 0) {
        bitrateSentHistoryRef.current.push(currentBitrateSent);

        if (bitrateSentHistoryRef.current.length > SMOOTHING_WINDOW) {
          bitrateSentHistoryRef.current.shift();
        }
      }

      if (currentBitrateReceived > 0) {
        bitrateReceivedHistoryRef.current.push(currentBitrateReceived);

        if (bitrateReceivedHistoryRef.current.length > SMOOTHING_WINDOW) {
          bitrateReceivedHistoryRef.current.shift();
        }
      }

      // Calculate moving averages
      const averageBitrateSent =
        bitrateSentHistoryRef.current.length > 0
          ? bitrateSentHistoryRef.current.reduce((a, b) => a + b, 0) /
            bitrateSentHistoryRef.current.length
          : 0;

      const averageBitrateReceived =
        bitrateReceivedHistoryRef.current.length > 0
          ? bitrateReceivedHistoryRef.current.reduce((a, b) => a + b, 0) /
            bitrateReceivedHistoryRef.current.length
          : 0;

      setStats((prev) => ({
        producer: producerStats,
        consumer: consumerStats,
        screenShare: screenShareStatsResult,
        totalBytesReceived: prev.totalBytesReceived + bytesReceivedDelta,
        totalBytesSent: prev.totalBytesSent + bytesSentDelta,
        currentBitrateSent,
        currentBitrateReceived,
        averageBitrateSent,
        averageBitrateReceived,
        isMonitoring: true
      }));

      previousStatsRef.current = {
        producer: producerStats,
        consumer: consumerStats
      };
    } catch (error) {
      logVoice('Error collecting transport stats', { error });
    }
  }, [parseTransportStats, parseScreenShareStats]);

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
        collectStats();
        intervalRef.current = setInterval(collectStats, intervalMs);
      }
    },
    [collectStats]
  );

  const setScreenShareProducer = useCallback(
    (producer: Producer<AppData> | null | undefined) => {
      screenShareProducerRef.current = producer || null;

      if (!producer) {
        previousScreenShareBytesRef.current = null;

        setStats((prev) => ({
          ...prev,
          screenShare: null
        }));
      }
    },
    []
  );

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    producerTransportRef.current = null;
    consumerTransportRef.current = null;
    screenShareProducerRef.current = null;

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
      screenShare: null,
      totalBytesReceived: 0,
      totalBytesSent: 0,
      currentBitrateSent: 0,
      currentBitrateReceived: 0,
      averageBitrateSent: 0,
      averageBitrateReceived: 0,
      isMonitoring: false
    });

    previousStatsRef.current = {
      producer: null,
      consumer: null
    };

    previousScreenShareBytesRef.current = null;
    bitrateSentHistoryRef.current = [];
    bitrateReceivedHistoryRef.current = [];

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
    resetStats,
    setScreenShareProducer
  };
};

export { useTransportStats };
