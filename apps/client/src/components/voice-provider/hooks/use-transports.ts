import { logVoice } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TRemoteUserStreamKinds } from '@/types';
import { getMediasoupKind, StreamKind } from '@sharkord/shared';
import { TRPCClientError } from '@trpc/client';
import {
  type AppData,
  type Consumer,
  type Device,
  type RtpCapabilities,
  type Transport
} from 'mediasoup-client/types';
import { useCallback, useRef } from 'react';

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
  addExternalStream: (streamId: number, stream: MediaStream) => void;
  removeExternalStream: (streamId: number) => void;
};

const useTransports = ({
  addRemoteUserStream,
  removeRemoteUserStream,
  addExternalStream,
  removeExternalStream
}: TUseTransportParams) => {
  const producerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumers = useRef<{
    [userId: number]: {
      [kind: string]: Consumer<AppData>;
    };
  }>({});
  const consumeOperationsInProgress = useRef<Set<string>>(new Set());

  const createProducerTransport = useCallback(async (device: Device) => {
    logVoice('Creating producer transport', { device });

    const trpc = getTRPCClient();

    try {
      const params = await trpc.voice.createProducerTransport.mutate();

      logVoice('Got producer transport parameters', { params });

      producerTransport.current = device.createSendTransport(params);

      producerTransport.current.on(
        'connect',
        async ({ dtlsParameters }, callback, errback) => {
          logVoice('Producer transport connected', { dtlsParameters });

          try {
            await trpc.voice.connectProducerTransport.mutate({
              dtlsParameters
            });

            callback();
          } catch (error) {
            errback(error as Error);
            logVoice('Error connecting producer transport', { error });
          }
        }
      );

      producerTransport.current.on('connectionstatechange', (state) => {
        logVoice('Producer transport connection state changed', { state });

        if (state === 'failed') {
          logVoice('Producer transport failed, attempting cleanup');
          producerTransport.current?.close();
          producerTransport.current = undefined;

          // TODO: Implement reconnection logic here
          // This should trigger a reconnection attempt after a delay
        } else if (state === 'disconnected') {
          logVoice('Producer transport disconnected, monitoring for recovery');

          // Give some time for automatic recovery before declaring it failed
          setTimeout(() => {
            if (producerTransport.current?.connectionState === 'disconnected') {
              logVoice(
                'Producer transport still disconnected after timeout, cleaning up'
              );
              producerTransport.current?.close();
              producerTransport.current = undefined;
            }
          }, 5000); // 5 second timeout
        } else if (state === 'closed') {
          logVoice('Producer transport closed');
          producerTransport.current = undefined;
        }
      });

      producerTransport.current.on('icecandidateerror', (error) => {
        logVoice('Producer transport ICE candidate error', { error });
      });

      producerTransport.current.on(
        'produce',
        async ({ rtpParameters, appData }, callback, errback) => {
          logVoice('Producing new track', { rtpParameters, appData });

          const { kind } = appData as { kind: StreamKind };

          if (!producerTransport.current) return;

          try {
            const producerId = await trpc.voice.produce.mutate({
              transportId: producerTransport.current.id,
              kind,
              rtpParameters
            });

            callback({ id: producerId });
          } catch (error) {
            if (error instanceof TRPCClientError) {
              if (error.data.code === 'FORBIDDEN') {
                logVoice('Permission denied to produce track', { kind });
                errback(
                  new Error(
                    `You don't have permission to ${kind} in this channel`
                  )
                );

                return;
              }
            }

            logVoice('Error producing new track', { error });
            errback(error as Error);
          }
        }
      );
    } catch (error) {
      logVoice('Error creating producer transport', { error });
    }
  }, []);

  const createConsumerTransport = useCallback(async (device: Device) => {
    logVoice('Creating consumer transport', { device });

    const trpc = getTRPCClient();

    try {
      const params = await trpc.voice.createConsumerTransport.mutate();

      logVoice('Got consumer transport parameters', { params });

      consumerTransport.current = device.createRecvTransport(params);

      consumerTransport.current.on(
        'connect',
        async ({ dtlsParameters }, callback, errback) => {
          logVoice('Consumer transport connected', { dtlsParameters });

          try {
            await trpc.voice.connectConsumerTransport.mutate({
              dtlsParameters
            });

            callback();
          } catch (error) {
            errback(error as Error);
            logVoice('Consumer transport connect error', { error });
          }
        }
      );

      consumerTransport.current.on('connectionstatechange', (state) => {
        logVoice('Consumer transport connection state changed', { state });

        if (state === 'failed') {
          logVoice('Consumer transport failed, attempting cleanup');

          // Clean up all consumers using this transport
          Object.values(consumers.current).forEach((userConsumers) => {
            Object.values(userConsumers).forEach((consumer) => {
              consumer.close();
            });
          });
          consumers.current = {};

          consumerTransport.current?.close();
          consumerTransport.current = undefined;

          // TODO: Implement reconnection logic here
        } else if (state === 'disconnected') {
          logVoice('Consumer transport disconnected, monitoring for recovery');

          // Give some time for automatic recovery
          setTimeout(() => {
            if (consumerTransport.current?.connectionState === 'disconnected') {
              logVoice(
                'Consumer transport still disconnected after timeout, cleaning up'
              );

              // Clean up all consumers
              Object.values(consumers.current).forEach((userConsumers) => {
                Object.values(userConsumers).forEach((consumer) => {
                  consumer.close();
                });
              });
              consumers.current = {};

              consumerTransport.current?.close();
              consumerTransport.current = undefined;
            }
          }, 5000); // 5 second timeout
        } else if (state === 'closed') {
          logVoice('Consumer transport closed');
          consumerTransport.current = undefined;
        }
      });

      consumerTransport.current.on('icecandidateerror', (error) => {
        logVoice('Consumer transport ICE candidate error', { error });
      });
    } catch (error) {
      logVoice('Failed to create consumer transport', { error });
    }
  }, []);

  const consume = useCallback(
    async (
      remoteId: number,
      kind: StreamKind,
      routerRtpCapabilities: RtpCapabilities
    ) => {
      if (!consumerTransport.current) {
        logVoice('Consumer transport not available');
        return;
      }

      const operationKey = `${remoteId}-${kind}`;

      if (consumeOperationsInProgress.current.has(operationKey)) {
        logVoice('Consume operation already in progress', {
          remoteId,
          kind
        });
        return;
      }

      consumeOperationsInProgress.current.add(operationKey);

      try {
        logVoice('Consuming remote producer', { remoteId, kind });

        const trpc = getTRPCClient();

        const { producerId, consumerId, consumerKind, consumerRtpParameters } =
          await trpc.voice.consume.mutate({
            kind,
            remoteId,
            rtpCapabilities: routerRtpCapabilities
          });

        logVoice('Got consumer parameters', {
          producerId,
          consumerId,
          consumerKind,
          consumerRtpParameters
        });

        if (!consumers.current[remoteId]) {
          consumers.current[remoteId] = {};
        }

        const existingConsumer = consumers.current[remoteId][consumerKind];

        if (existingConsumer && !existingConsumer.closed) {
          logVoice('Closing existing consumer before creating new one');

          existingConsumer.close();
          delete consumers.current[remoteId][consumerKind];
        }

        const newConsumer = await consumerTransport.current.consume({
          id: consumerId,
          producerId: producerId,
          kind: getMediasoupKind(consumerKind),
          rtpParameters: consumerRtpParameters
        });

        logVoice('Created new consumer', { newConsumer });

        const cleanupEvents = [
          'transportclose',
          'trackended',
          '@close',
          'close'
        ];

        cleanupEvents.forEach((event) => {
          // @ts-expect-error - YOLO
          newConsumer?.on(event, () => {
            logVoice(`Consumer cleanup event "${event}" triggered`, {
              remoteId,
              kind
            });

            if (
              kind === StreamKind.EXTERNAL_VIDEO ||
              kind === StreamKind.EXTERNAL_AUDIO
            ) {
              removeExternalStream(remoteId);
            } else {
              removeRemoteUserStream(remoteId, kind);
            }

            if (consumers.current[remoteId]?.[consumerKind]) {
              delete consumers.current[remoteId][consumerKind];
            }
          });
        });

        consumers.current[remoteId][consumerKind] = newConsumer;

        const stream = new MediaStream();

        stream.addTrack(newConsumer.track);

        if (
          kind === StreamKind.EXTERNAL_VIDEO ||
          kind === StreamKind.EXTERNAL_AUDIO
        ) {
          addExternalStream(remoteId, stream);
        } else {
          addRemoteUserStream(remoteId, stream, kind);
        }
      } catch (error) {
        logVoice('Error consuming remote producer', { error });
      } finally {
        consumeOperationsInProgress.current.delete(operationKey);
      }
    },
    [
      addRemoteUserStream,
      removeRemoteUserStream,
      addExternalStream,
      removeExternalStream
    ]
  );

  const consumeExistingProducers = useCallback(
    async (routerRtpCapabilities: RtpCapabilities) => {
      logVoice('Consuming existing producers', { routerRtpCapabilities });

      const trpc = getTRPCClient();

      try {
        const {
          remoteAudioIds,
          remoteScreenIds,
          remoteVideoIds,
          remoteExternalAudioIds,
          remoteExternalVideoIds
        } = await trpc.voice.getProducers.query();

        logVoice('Got existing producers', {
          remoteAudioIds,
          remoteScreenIds,
          remoteVideoIds
        });

        remoteAudioIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.AUDIO, routerRtpCapabilities);
        });

        remoteVideoIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.VIDEO, routerRtpCapabilities);
        });

        remoteScreenIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.SCREEN, routerRtpCapabilities);
        });

        remoteExternalAudioIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.EXTERNAL_AUDIO, routerRtpCapabilities);
        });

        remoteExternalVideoIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.EXTERNAL_VIDEO, routerRtpCapabilities);
        });
      } catch (error) {
        logVoice('Error consuming existing producers', { error });
      }
    },
    [consume]
  );

  return {
    producerTransport,
    consumerTransport,
    consumers,
    createProducerTransport,
    createConsumerTransport,
    consume,
    consumeExistingProducers
  };
};

export { useTransports };
