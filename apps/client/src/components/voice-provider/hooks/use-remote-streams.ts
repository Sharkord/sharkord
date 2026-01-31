import type { TRemoteStreams, TRemoteUserStreamKinds } from '@/types';
import { StreamKind } from '@sharkord/shared';
import { useCallback, useState } from 'react';

export type TExternalStreamState = {
  audioStream?: MediaStream;
  videoStream?: MediaStream;
};

export type TExternalStreamsMap = {
  [streamId: number]: TExternalStreamState;
};

const useRemoteStreams = () => {
  const [remoteUserStreams, setRemoteUserStreams] = useState<TRemoteStreams>(
    {}
  );
  const [externalStreams, setExternalStreams] = useState<TExternalStreamsMap>(
    {}
  );

  const addExternalStreamTrack = useCallback(
    (
      streamId: number,
      stream: MediaStream,
      kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
    ) => {
      setExternalStreams((prev) => {
        const existing = prev[streamId] || {};
        const newState = { ...prev };

        if (kind === StreamKind.EXTERNAL_AUDIO) {
          newState[streamId] = { ...existing, audioStream: stream };
        } else {
          newState[streamId] = { ...existing, videoStream: stream };
        }

        return newState;
      });
    },
    []
  );

  const removeExternalStreamTrack = useCallback(
    (
      streamId: number,
      kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
    ) => {
      setExternalStreams((prev) => {
        const existing = prev[streamId];
        if (!existing) return prev;

        const newState = { ...prev };
        const streamEntry = { ...existing };

        if (kind === StreamKind.EXTERNAL_AUDIO && streamEntry.audioStream) {
          streamEntry.audioStream.getTracks().forEach((track) => track.stop());

          delete streamEntry.audioStream;
        } else if (
          kind === StreamKind.EXTERNAL_VIDEO &&
          streamEntry.videoStream
        ) {
          streamEntry.videoStream.getTracks().forEach((track) => track.stop());

          delete streamEntry.videoStream;
        }

        if (!streamEntry.audioStream && !streamEntry.videoStream) {
          delete newState[streamId];
        } else {
          newState[streamId] = streamEntry;
        }

        return newState;
      });
    },
    []
  );

  const removeExternalStream = useCallback((streamId: number) => {
    setExternalStreams((prev) => {
      const existing = prev[streamId];

      if (!existing) return prev;

      existing.audioStream?.getTracks().forEach((track) => track.stop());
      existing.videoStream?.getTracks().forEach((track) => track.stop());

      const newState = { ...prev };
      delete newState[streamId];

      return newState;
    });
  }, []);

  const clearExternalStreams = useCallback(() => {
    setExternalStreams((prev) => {
      Object.values(prev).forEach((item) => {
        item.audioStream?.getTracks().forEach((track) => track.stop());
        item.videoStream?.getTracks().forEach((track) => track.stop());
      });

      return {};
    });
  }, []);

  const addRemoteUserStream = useCallback(
    (userId: number, stream: MediaStream, kind: TRemoteUserStreamKinds) => {
      setRemoteUserStreams((prev) => {
        const newState = { ...prev };

        newState[userId] = {
          ...newState[userId],
          [kind]: stream
        };

        return newState;
      });
    },
    []
  );

  const removeRemoteUserStream = useCallback(
    (userId: number, kind: TRemoteUserStreamKinds) => {
      setRemoteUserStreams((prev) => {
        const streamToRemove = prev[userId]?.[kind];

        if (streamToRemove) {
          streamToRemove?.getTracks()?.forEach((track) => track?.stop?.());
        }

        const newState = { ...prev };

        newState[userId] = {
          ...newState[userId],
          [kind]: undefined
        };

        return newState;
      });
    },
    []
  );

  const clearRemoteUserStreamsForUser = useCallback((userId: number) => {
    setRemoteUserStreams((prev) => {
      const userStreams = prev[userId];

      if (userStreams) {
        Object.values(userStreams).forEach((stream) => {
          stream?.getTracks()?.forEach((track) => {
            track?.stop?.();
          });
        });
      }

      const newState = { ...prev };

      delete newState[userId];

      return newState;
    });
  }, []);

  const clearRemoteUserStreams = useCallback(() => {
    setRemoteUserStreams((prev) => {
      Object.values(prev).forEach((streams) => {
        Object.values(streams).forEach((stream) => {
          stream?.getTracks()?.forEach((track) => track?.stop?.());
        });
      });

      return {};
    });
  }, []);

  return {
    remoteUserStreams,
    externalStreams,
    addExternalStreamTrack,
    removeExternalStreamTrack,
    removeExternalStream,
    clearExternalStreams,
    addRemoteUserStream,
    removeRemoteUserStream,
    clearRemoteUserStreamsForUser,
    clearRemoteUserStreams
  };
};

export { useRemoteStreams };
