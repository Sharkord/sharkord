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

  const localVideoProducer = useRef<Producer<AppData> | undefined>(undefined);
  const localAudioProducer = useRef<Producer<AppData> | undefined>(undefined);
  const localScreenShareProducer = useRef<Producer<AppData> | undefined>(
    undefined
  );

  const clearLocalStreams = useCallback(() => {
    localVideoStream?.getTracks().forEach((track) => track.stop());
    localAudioStream?.getTracks().forEach((track) => track.stop());
    localScreenShareStream?.getTracks().forEach((track) => track.stop());

    setLocalVideoStream(undefined);
    setLocalAudioStream(undefined);
    setLocalScreenShare(undefined);

    localVideoProducer.current?.close();
    localAudioProducer.current?.close();
    localScreenShareProducer.current?.close();

    localVideoProducer.current = undefined;
    localAudioProducer.current = undefined;
    localScreenShareProducer.current = undefined;
  }, [localAudioStream, localScreenShareStream, localVideoStream]);

  return {
    localVideoStream,
    setLocalVideoStream,

    localAudioStream,
    setLocalAudioStream,

    localScreenShareStream,
    setLocalScreenShare,

    localVideoProducer,
    localAudioProducer,
    localScreenShareProducer,

    clearLocalStreams
  };
};

export { useLocalStreams };
