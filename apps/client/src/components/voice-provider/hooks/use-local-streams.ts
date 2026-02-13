import type { AppData, Producer } from 'mediasoup-client/types';
import { useCallback, useRef, useState } from 'react';

const useLocalStreams = () => {
  const [localVideoStream, setLocalVideoStream] = useState<
    MediaStream | undefined
  >(undefined);
  const [localAudioStream, setLocalAudioStream] = useState<
    MediaStream | undefined
  >(undefined);
  const [localScreenShareStream, setLocalScreenShare] = useState<
    MediaStream | undefined
  >(undefined);
  const [localScreenShareAudioStream, setLocalScreenShareAudio] = useState<
    MediaStream | undefined
  >(undefined);

  const localVideoProducer = useRef<Producer<AppData> | undefined>(undefined);
  const localAudioProducer = useRef<Producer<AppData> | undefined>(undefined);
  const localScreenShareProducer = useRef<Producer<AppData> | undefined>(undefined);
  const localScreenShareAudioProducer = useRef<Producer<AppData> | undefined>(undefined);

  const clearLocalStreams = useCallback(() => {
    localVideoStream?.getTracks().forEach((track) => track.stop());
    localAudioStream?.getTracks().forEach((track) => track.stop());
    localScreenShareStream?.getTracks().forEach((track) => track.stop());
    localScreenShareAudioStream?.getTracks().forEach((track) => track.stop());

    setLocalVideoStream(undefined);
    setLocalAudioStream(undefined);
    setLocalScreenShare(undefined);
    setLocalScreenShareAudio(undefined);

    localVideoProducer.current?.close();
    localAudioProducer.current?.close();
    localScreenShareProducer.current?.close();
    localScreenShareAudioProducer.current?.close();

    localVideoProducer.current = undefined;
    localAudioProducer.current = undefined;
    localScreenShareProducer.current = undefined;
    localScreenShareAudioProducer.current = undefined;
  }, [localAudioStream, localScreenShareStream, localVideoStream, localScreenShareAudioStream]);

  return {
    localVideoStream,
    setLocalVideoStream,

    localAudioStream,
    setLocalAudioStream,

    localScreenShareStream,
    setLocalScreenShare,

    localScreenShareAudioStream,
    setLocalScreenShareAudio,

    localVideoProducer,
    localAudioProducer,
    localScreenShareProducer,
    localScreenShareAudioProducer,

    clearLocalStreams
  };
};

export { useLocalStreams };
