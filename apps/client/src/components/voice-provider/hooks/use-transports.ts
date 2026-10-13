import { voiceLogger } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TRemoteUserStreamKinds } from '@/types';
import {
  type ConsumerType,
  getMediasoupKind,
  StreamKind,
  type TProducibleStreamKind,
  type TStreamQualityLayer
} from '@sharkord/shared';
import { TRPCClientError } from '@trpc/client';
import {
  type AppData,
  type Consumer,
  type Device,
  type RtpCapabilities,
  type Transport
} from 'mediasoup-client/types';
import { useCallback, useRef } from 'react';
import { getStoredStreamQuality } from '../helpers';

type TUseTransportParams = {
  addRemoteUserStream: (
    userId: number,
    stream: MediaStream,
    kind: TRemoteUserStreamKinds
  ) => void;
  removeRemoteUserStream: (
    userId: number,
    kind: TRemoteUserStreamKinds
  ) => void;
  addExternalStreamTrack: (
    streamId: number,
    stream: MediaStream,
    kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
  ) => void;
  removeExternalStreamTrack: (
    streamId: number,
    kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
  ) => void;
  setRemoteConsumerType: (
    remoteId: number,
    kind: StreamKind,
    consumerType: ConsumerType | undefined
  ) => void;
  setRemoteStreamQualityLayers: (
    remoteId: number,
    kind: StreamKind,
    layers: TStreamQualityLayer[]
  ) => void;
  clearRemoteConsumerMetadata: () => void;
};

const useTransports = ({
  addRemoteUserStream,
  removeRemoteUserStream,
  addExternalStreamTrack,
  removeExternalStreamTrack,
  setRemoteConsumerType,
  setRemoteStreamQualityLayers,
  clearRemoteConsumerMetadata
}: TUseTransportParams) => {
  const producerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumers = useRef<{
    [userId: number]: {
      [kind: string]: Consumer<AppData>;
    };
  }>({});
  const consumerCodecs = useRef<Map<string, string>>(new Map());
  const consumeOperationsInProgress = useRef<Set<string>>(new Set());

  const createProducerTransport = useCallback(async (device: Device) => {
    voiceLogger.info('producer transport: creating');

    const trpc = getTRPCClient();

    try {
      const params = await trpc.voice.createProducerTransport.mutate();

      voiceLogger.info('producer transport: created', {
        transportId: params.id,
        iceCandidates: params.iceCandidates.length
      });

      producerTransport.current = device.createSendTransport(params);

      producerTransport.current.on(
        'connect',
        async ({ dtlsParameters }, callback, errback) => {
          voiceLogger.info('producer transport: dtls connect requested', {
            role: dtlsParameters.role
          });

          try {
            await trpc.voice.connectProducerTransport.mutate({
              dtlsParameters
            });

            callback();
          } catch (error) {
            errback(error as Error);
            voiceLogger.error('producer transport: dtls connect failed', error);
          }
        }
      );

      producerTransport.current.on('connectionstatechange', (state) => {
        voiceLogger.info('producer transport: connection state changed', {
          state
        });

        if (state === 'failed') {
          voiceLogger.error(
            'producer transport: ice failed, closing',
            new Error(`connection state ${state}`)
          );
          producerTransport.current?.close();
        } else if (state === 'closed') {
          voiceLogger.info('producer transport: closed');
          producerTransport.current = undefined;
        }
      });

      producerTransport.current.on('icecandidateerror', (error) => {
        voiceLogger.warn('producer transport: ice candidate error', {
          address: error.address,
          port: error.port,
          errorCode: error.errorCode,
          errorText: error.errorText
        });
      });

      producerTransport.current.on(
        'produce',
        async ({ rtpParameters, appData }, callback, errback) => {
          voiceLogger.info('producer transport: producing track', {
            kind: (appData as { kind: StreamKind }).kind,
            codec: rtpParameters.codecs[0]?.mimeType,
            encodings: rtpParameters.encodings?.length ?? 0
          });

          const { kind, qualityLayers } = appData as {
            kind: TProducibleStreamKind;
            qualityLayers?: TStreamQualityLayer[];
          };

          if (!producerTransport.current) return;

          try {
            const producerId = await trpc.voice.produce.mutate({
              transportId: producerTransport.current.id,
              kind,
              rtpParameters,
              qualityLayers
            });

            voiceLogger.info('producer transport: track produced', {
              kind,
              producerId
            });

            callback({ id: producerId });
          } catch (error) {
            if (error instanceof TRPCClientError) {
              if (error.data.code === 'FORBIDDEN') {
                voiceLogger.warn('producer transport: produce denied', {
                  kind
                });
                errback(
                  new Error(
                    `You don't have permission to ${kind} in this channel`
                  )
                );

                return;
              }
            }

            voiceLogger.error('producer transport: produce failed', error, {
              kind
            });
            errback(error as Error);
          }
        }
      );
    } catch (error) {
      voiceLogger.error('producer transport: create failed', error);
    }
  }, []);

  const createConsumerTransport = useCallback(async (device: Device) => {
    voiceLogger.info('consumer transport: creating');

    const trpc = getTRPCClient();

    try {
      const params = await trpc.voice.createConsumerTransport.mutate();

      voiceLogger.info('consumer transport: created', {
        transportId: params.id,
        iceCandidates: params.iceCandidates.length
      });

      consumerTransport.current = device.createRecvTransport(params);

      consumerTransport.current.on(
        'connect',
        async ({ dtlsParameters }, callback, errback) => {
          voiceLogger.info('consumer transport: dtls connect requested', {
            role: dtlsParameters.role
          });

          try {
            await trpc.voice.connectConsumerTransport.mutate({
              dtlsParameters
            });

            callback();
          } catch (error) {
            errback(error as Error);
            voiceLogger.error('consumer transport: dtls connect failed', error);
          }
        }
      );

      consumerTransport.current.on('connectionstatechange', (state) => {
        voiceLogger.info('consumer transport: connection state changed', {
          state
        });

        if (state === 'failed') {
          voiceLogger.error(
            'consumer transport: ice failed, closing',
            new Error(`connection state ${state}`)
          );

          Object.values(consumers.current).forEach((userConsumers) => {
            Object.values(userConsumers).forEach((consumer) => {
              consumer.close();
            });
          });
          consumers.current = {};

          consumerTransport.current?.close();
          consumerTransport.current = undefined;
        } else if (state === 'closed') {
          voiceLogger.info('consumer transport: closed');
          consumerTransport.current = undefined;
        }
      });

      consumerTransport.current.on('icecandidateerror', (error) => {
        voiceLogger.warn('consumer transport: ice candidate error', {
          address: error.address,
          port: error.port,
          errorCode: error.errorCode,
          errorText: error.errorText
        });
      });
    } catch (error) {
      voiceLogger.error('consumer transport: create failed', error);
    }
  }, []);

  const consume = useCallback(
    async (
      remoteId: number,
      kind: StreamKind,
      rtpCapabilities: RtpCapabilities
    ) => {
      if (!consumerTransport.current) {
        voiceLogger.warn('consumer: skipped, no consumer transport', {
          remoteId,
          kind
        });
        return;
      }

      const operationKey = `${remoteId}-${kind}`;

      if (consumeOperationsInProgress.current.has(operationKey)) {
        voiceLogger.warn('consumer: skipped, consume already in progress', {
          remoteId,
          kind
        });
        return;
      }

      consumeOperationsInProgress.current.add(operationKey);

      try {
        voiceLogger.info('consumer: consuming', { remoteId, kind });

        const trpc = getTRPCClient();

        const {
          producerId,
          consumerId,
          consumerKind,
          consumerRtpParameters,
          consumerType,
          qualityLayers
        } = await trpc.voice.consume.mutate({
          kind,
          remoteId,
          rtpCapabilities
        });

        voiceLogger.info('consumer: parameters received', {
          remoteId,
          producerId,
          consumerId,
          consumerKind,
          consumerType,
          qualityLayers: qualityLayers.length
        });

        if (!consumers.current[remoteId]) {
          consumers.current[remoteId] = {};
        }

        const existingConsumer = consumers.current[remoteId][consumerKind];

        if (existingConsumer && !existingConsumer.closed) {
          voiceLogger.info('consumer: replacing existing consumer', {
            remoteId,
            kind
          });

          existingConsumer.close();
          delete consumers.current[remoteId][consumerKind];
        }

        const newConsumer = await consumerTransport.current.consume({
          id: consumerId,
          producerId: producerId,
          kind: getMediasoupKind(consumerKind),
          rtpParameters: consumerRtpParameters
        });

        voiceLogger.info('consumer: created', {
          remoteId,
          kind,
          consumerId: newConsumer.id,
          codec: newConsumer.rtpParameters.codecs[0]?.mimeType
        });

        const cleanupEvents = [
          'transportclose',
          'trackended',
          '@close',
          'close'
        ];

        cleanupEvents.forEach((event) => {
          // @ts-expect-error - YOLO
          newConsumer?.on(event, () => {
            voiceLogger.info('consumer: cleanup event', {
              event,
              remoteId,
              kind
            });

            if (
              kind === StreamKind.EXTERNAL_VIDEO ||
              kind === StreamKind.EXTERNAL_AUDIO
            ) {
              removeExternalStreamTrack(remoteId, kind);
            } else {
              removeRemoteUserStream(remoteId, kind);
            }

            if (consumers.current[remoteId]?.[consumerKind]) {
              delete consumers.current[remoteId][consumerKind];
            }

            consumerCodecs.current.delete(`${remoteId}-${kind}`);

            setRemoteConsumerType(remoteId, kind, undefined);
            setRemoteStreamQualityLayers(remoteId, kind, []);
          });
        });

        consumers.current[remoteId][consumerKind] = newConsumer;

        setRemoteConsumerType(remoteId, kind, consumerType);
        setRemoteStreamQualityLayers(remoteId, kind, qualityLayers);

        const codecKey = `${remoteId}-${kind}`;

        const negotiatedCodec =
          newConsumer.rtpParameters?.codecs?.[0]?.mimeType;

        if (negotiatedCodec) {
          consumerCodecs.current.set(codecKey, negotiatedCodec);
        }

        if (
          consumerType === 'simulcast' &&
          (kind === StreamKind.VIDEO ||
            kind === StreamKind.SCREEN ||
            kind === StreamKind.EXTERNAL_VIDEO)
        ) {
          const quality = getStoredStreamQuality(remoteId, kind, qualityLayers);

          if (quality.mode === 'layer') {
            await trpc.voice.setConsumerQuality.mutate({
              remoteId,
              kind,
              quality
            });
          }
        }

        const stream = new MediaStream();

        stream.addTrack(newConsumer.track);

        if (
          kind === StreamKind.EXTERNAL_VIDEO ||
          kind === StreamKind.EXTERNAL_AUDIO
        ) {
          addExternalStreamTrack(remoteId, stream, kind);
        } else {
          addRemoteUserStream(remoteId, stream, kind);
        }
      } catch (error) {
        voiceLogger.error('consumer: consume failed', error, {
          remoteId,
          kind
        });
      } finally {
        consumeOperationsInProgress.current.delete(operationKey);
      }
    },
    [
      addRemoteUserStream,
      removeRemoteUserStream,
      addExternalStreamTrack,
      removeExternalStreamTrack,
      setRemoteConsumerType,
      setRemoteStreamQualityLayers
    ]
  );

  const consumeExistingProducers = useCallback(
    async (
      rtpCapabilities: RtpCapabilities,
      externalStreamTracks?: {
        [streamId: number]: { audio?: boolean; video?: boolean };
      }
    ) => {
      voiceLogger.info('session: consuming existing producers');

      const trpc = getTRPCClient();

      try {
        const {
          remoteAudioIds,
          remoteScreenIds,
          remoteScreenAudioIds,
          remoteVideoIds,
          remoteExternalStreamIds
        } = await trpc.voice.getProducers.query();

        voiceLogger.info('session: existing producers received', {
          remoteAudioIds,
          remoteVideoIds,
          remoteScreenIds,
          remoteScreenAudioIds,
          remoteExternalStreamIds
        });

        remoteAudioIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.AUDIO, rtpCapabilities);
        });

        remoteVideoIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.VIDEO, rtpCapabilities);
        });

        remoteScreenIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.SCREEN, rtpCapabilities);
        });

        remoteScreenAudioIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.SCREEN_AUDIO, rtpCapabilities);
        });

        remoteExternalStreamIds.forEach((streamId: number) => {
          const tracks = externalStreamTracks?.[streamId];

          if (tracks?.audio !== false) {
            consume(streamId, StreamKind.EXTERNAL_AUDIO, rtpCapabilities);
          }
          if (tracks?.video !== false) {
            consume(streamId, StreamKind.EXTERNAL_VIDEO, rtpCapabilities);
          }
        });
      } catch (error) {
        voiceLogger.error(
          'session: consuming existing producers failed',
          error
        );
      }
    },
    [consume]
  );

  const getConsumerCodec = useCallback(
    (remoteId: number, kind: StreamKind): string | undefined => {
      return consumerCodecs.current.get(`${remoteId}-${kind}`);
    },
    []
  );

  const cleanupTransports = useCallback(() => {
    voiceLogger.info('session: cleaning up transports');

    Object.values(consumers.current).forEach((userConsumers) => {
      Object.values(userConsumers).forEach((consumer) => {
        if (!consumer.closed) {
          consumer.close();
        }
      });
    });

    consumers.current = {};
    consumerCodecs.current.clear();

    clearRemoteConsumerMetadata();

    consumeOperationsInProgress.current.clear();

    if (producerTransport.current && !producerTransport.current.closed) {
      producerTransport.current.close();
    }

    producerTransport.current = undefined;

    if (consumerTransport.current && !consumerTransport.current.closed) {
      consumerTransport.current.close();
    }

    consumerTransport.current = undefined;

    voiceLogger.info('session: transports cleanup complete');
  }, [clearRemoteConsumerMetadata]);

  return {
    producerTransport,
    consumerTransport,
    consumers,
    createProducerTransport,
    createConsumerTransport,
    consume,
    consumeExistingProducers,
    cleanupTransports,
    getConsumerCodec
  };
};

export { useTransports };
