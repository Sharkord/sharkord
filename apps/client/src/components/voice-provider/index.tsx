import { getTRPCClient } from '@/lib/trpc';
import { StreamKind, type RtpCapabilities } from '@sharkord/shared';
import { Device } from 'mediasoup-client';
import {
  createContext,
  memo,
  useCallback,
  useMemo,
  useRef,
  useState
} from 'react';
import { logVoice } from './helpers';
import { useLocalStreams } from './hooks/use-local-streams';
import { useRemoteStreams } from './hooks/use-remote-streams';
import { useTransports } from './hooks/use-transports';
import { useVoiceControls } from './hooks/use-voice-controls';
import { useVoiceEvents } from './hooks/use-voice-events';

export type TVoiceProvider = {
  loading: boolean;
  init: (
    routerRtpCapabilities: RtpCapabilities,
    channelId: number
  ) => Promise<void>;
} & Pick<
  ReturnType<typeof useLocalStreams>,
  'localAudioStream' | 'localVideoStream' | 'localScreenShareStream'
> &
  Pick<ReturnType<typeof useRemoteStreams>, 'remoteStreams'> &
  ReturnType<typeof useVoiceControls>;

const VoiceProviderContext = createContext<TVoiceProvider>({
  loading: false,
  init: () => Promise.resolve(),
  toggleMic: () => Promise.resolve(),
  toggleSound: () => Promise.resolve(),
  toggleWebcam: () => Promise.resolve(),
  toggleScreenShare: () => Promise.resolve(),
  ownVoiceState: {
    micMuted: false,
    soundMuted: false,
    webcamEnabled: false,
    sharingScreen: false
  },
  localAudioStream: undefined,
  localVideoStream: undefined,
  localScreenShareStream: undefined,

  remoteStreams: {}
});

export { VoiceProviderContext };

type TVoiceProviderProps = {
  children: React.ReactNode;
};

const VoiceProvider = memo(({ children }: TVoiceProviderProps) => {
  const [loading, setLoading] = useState(false);
  const routerRtpCapabilities = useRef<RtpCapabilities | null>(null);

  const {
    addRemoteStream,
    removeRemoteStream,
    clearRemoteStreamsForUser,
    remoteStreams
  } = useRemoteStreams();
  const {
    localAudioProducer,
    localVideoProducer,
    localAudioStream,
    localVideoStream,
    localScreenShareStream,
    localScreenShareProducer,
    setLocalAudioStream,
    setLocalVideoStream,
    setLocalScreenShare
  } = useLocalStreams();
  const {
    producerTransport,
    createProducerTransport,
    createConsumerTransport,
    consume,
    consumeExistingProducers
  } = useTransports({
    addRemoteStream,
    removeRemoteStream
  });

  const startMicStream = useCallback(async () => {
    logVoice('Starting microphone stream');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 48000,
        channelCount: 2,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      },
      video: false
    });

    logVoice('Microphone stream obtained', { stream });

    setLocalAudioStream(stream);

    const audioTrack = stream.getAudioTracks()[0];

    if (audioTrack) {
      logVoice('Obtained audio track', { audioTrack });

      localAudioProducer.current = await producerTransport.current?.produce({
        track: audioTrack,
        appData: { kind: StreamKind.AUDIO }
      });

      logVoice('Microphone audio producer created', {
        producer: localAudioProducer.current
      });
    } else {
      logVoice('No audio track obtained from microphone stream');
    }
  }, [producerTransport, setLocalAudioStream, localAudioProducer]);

  const startWebcamStream = useCallback(async () => {
    logVoice('Starting webcam stream');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true
    });

    logVoice('Webcam stream obtained', { stream });

    setLocalVideoStream(stream);

    const videoTrack = stream.getVideoTracks()[0];

    if (videoTrack) {
      logVoice('Obtained video track', { videoTrack });

      localVideoProducer.current = await producerTransport.current?.produce({
        track: videoTrack,
        appData: { kind: StreamKind.VIDEO }
      });

      logVoice('Webcam video producer created', {
        producer: localVideoProducer.current
      });

      localVideoProducer.current?.on('@close', async () => {
        const trpc = getTRPCClient();

        try {
          await trpc.voice.closeProducer.mutate({
            kind: StreamKind.VIDEO
          });
        } catch (error) {
          logVoice('Error closing video producer', { error });
        }
      });
    } else {
      logVoice('No video track obtained from webcam stream');
    }
  }, [setLocalVideoStream, localVideoProducer, producerTransport]);

  const stopWebcamStream = useCallback(() => {
    logVoice('Stopping webcam stream');

    localVideoStream?.getVideoTracks().forEach((track) => {
      logVoice('Stopping video track', { track });

      track.stop();
      localVideoStream.removeTrack(track);
    });

    localVideoProducer.current?.close();
    localVideoProducer.current = undefined;

    setLocalVideoStream(undefined);
  }, [localVideoStream, setLocalVideoStream, localVideoProducer]);

  const stopScreenShareStream = useCallback(() => {
    logVoice('Stopping screen share stream');

    localScreenShareStream?.getTracks().forEach((track) => {
      logVoice('Stopping screen share track', { track });

      track.stop();
      localScreenShareStream.removeTrack(track);
    });

    localScreenShareProducer.current?.close();
    localScreenShareProducer.current = undefined;

    setLocalScreenShare(undefined);
  }, [localScreenShareStream, setLocalScreenShare, localScreenShareProducer]);

  const startScreenShareStream = useCallback(async () => {
    logVoice('Starting screen share stream');

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: 60
      },
      audio: true
    });

    logVoice('Screen share stream obtained', { stream });

    setLocalScreenShare(stream);

    const videoTrack = stream.getVideoTracks()[0];

    if (videoTrack) {
      logVoice('Obtained video track', { videoTrack });

      localScreenShareProducer.current =
        await producerTransport.current?.produce({
          track: videoTrack,
          appData: { kind: StreamKind.SCREEN }
        });

      localScreenShareProducer.current?.on('@close', async () => {
        logVoice('Screen share producer closed');

        const trpc = getTRPCClient();

        try {
          await trpc.voice.closeProducer.mutate({
            kind: StreamKind.SCREEN
          });
        } catch (error) {
          logVoice('Error closing screen share producer', { error });
        }
      });
    } else {
      logVoice('No video track obtained from screen share stream');
      throw new Error('No video track obtained for screen share');
    }

    return videoTrack;
  }, [setLocalScreenShare, localScreenShareProducer, producerTransport]);

  const init = useCallback(
    async (
      incomingRouterRtpCapabilities: RtpCapabilities,
      channelId: number
    ) => {
      logVoice('Initializing voice provider', {
        incomingRouterRtpCapabilities,
        channelId
      });

      setLoading(true);
      routerRtpCapabilities.current = incomingRouterRtpCapabilities;

      const device = new Device();
      await device.load({
        routerRtpCapabilities: incomingRouterRtpCapabilities
      });

      await createProducerTransport(device);
      await createConsumerTransport(device);
      await consumeExistingProducers(incomingRouterRtpCapabilities);
      await startMicStream();

      setLoading(false);
    },
    [
      createProducerTransport,
      createConsumerTransport,
      consumeExistingProducers,
      startMicStream
    ]
  );

  const {
    toggleMic,
    toggleSound,
    toggleWebcam,
    toggleScreenShare,
    ownVoiceState
  } = useVoiceControls({
    startMicStream,
    localAudioStream,
    startWebcamStream,
    stopWebcamStream,
    startScreenShareStream,
    stopScreenShareStream
  });

  useVoiceEvents({
    consume,
    removeRemoteStream,
    clearRemoteStreamsForUser,
    rtpCapabilities: routerRtpCapabilities.current!
  });

  const contextValue = useMemo<TVoiceProvider>(
    () => ({
      loading,
      init,

      toggleMic,
      toggleSound,
      toggleWebcam,
      toggleScreenShare,
      ownVoiceState,

      localAudioStream,
      localVideoStream,
      localScreenShareStream,

      remoteStreams
    }),
    [
      loading,
      init,

      toggleMic,
      toggleSound,
      toggleWebcam,
      toggleScreenShare,
      ownVoiceState,

      localAudioStream,
      localVideoStream,
      localScreenShareStream,
      remoteStreams
    ]
  );

  return (
    <VoiceProviderContext.Provider value={contextValue}>
      {children}
    </VoiceProviderContext.Provider>
  );
});

export { VoiceProvider };
