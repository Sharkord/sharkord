import { getTRPCClient } from '@/lib/trpc';
import { StreamKind } from '@sharkord/shared';
import {
  type AppData,
  type Consumer,
  type Device,
  type RtpCapabilities,
  type Transport
} from 'mediasoup-client/types';
import { useCallback, useRef } from 'react';
import { logVoice } from '../helpers';

type TUseTransportParams = {
  addRemoteStream: (
    userId: number,
    stream: MediaStream,
    kind: StreamKind
  ) => void;
  removeRemoteStream: (userId: number, kind: StreamKind) => void;
};

const useTransports = ({
  addRemoteStream,
  removeRemoteStream
}: TUseTransportParams) => {
  const producerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumers = useRef<{
    [userId: number]: {
      [kind: string]: Consumer<AppData>;
    };
  }>({});

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

        if (['failed', 'disconnected', 'closed'].includes(state)) {
          producerTransport.current?.close();
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
    } catch (error) {
      logVoice('Failed to create consumer transport', { error });
    }
  }, []);

  const consume = useCallback(
    async (
      remoteUserId: number,
      kind: StreamKind,
      routerRtpCapabilities: RtpCapabilities
    ) => {
      if (!consumerTransport.current) return;

      logVoice('Consuming remote producer', { remoteUserId, kind });

      const trpc = getTRPCClient();

      try {
        const { producerId, consumerId, consumerKind, consumerRtpParameters } =
          await trpc.voice.consume.mutate({
            kind,
            remoteUserId,
            rtpCapabilities: routerRtpCapabilities
          });

        logVoice('Got consumer parameters', {
          producerId,
          consumerId,
          consumerKind,
          consumerRtpParameters
        });

        if (!consumers.current[remoteUserId]) {
          consumers.current[remoteUserId] = {};
        }

        const existingConsumer = consumers.current[remoteUserId][consumerKind];

        if (existingConsumer) {
          existingConsumer.close();
          delete consumers.current[remoteUserId][consumerKind];
        }

        const targetKind =
          consumerKind === StreamKind.SCREEN ? StreamKind.VIDEO : consumerKind;

        const newConsumer = await consumerTransport.current.consume({
          id: consumerId,
          producerId: producerId,
          kind: targetKind,
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
            removeRemoteStream(remoteUserId, kind);
          });
        });

        consumers.current[remoteUserId][consumerKind] = newConsumer;

        const stream = new MediaStream();

        stream.addTrack(newConsumer.track);

        addRemoteStream(remoteUserId, stream, kind);
      } catch (error) {
        logVoice('Error consuming remote producer', { error });
      }
    },
    [addRemoteStream, removeRemoteStream]
  );

  const consumeExistingProducers = useCallback(
    async (routerRtpCapabilities: RtpCapabilities) => {
      logVoice('Consuming existing producers', { routerRtpCapabilities });

      const trpc = getTRPCClient();

      try {
        const { remoteAudioIds, remoteScreenIds, remoteVideoIds } =
          await trpc.voice.getProducers.query();

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
