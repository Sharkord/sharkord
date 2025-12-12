import type { TRemoteStreams } from '@/types';
import type { StreamKind } from '@sharkord/shared';
import { useCallback, useState } from 'react';

const useRemoteStreams = () => {
  const [remoteStreams, setRemoteStreams] = useState<TRemoteStreams>({});

  const addRemoteStream = useCallback(
    (userId: number, stream: MediaStream, kind: StreamKind) => {
      setRemoteStreams((prev) => {
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

  const removeRemoteStream = useCallback((userId: number, kind: StreamKind) => {
    setRemoteStreams((prev) => {
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
  }, []);

  const clearRemoteStreamsForUser = useCallback((userId: number) => {
    setRemoteStreams((prev) => {
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

  const clearRemoteStreams = useCallback(() => {
    setRemoteStreams((prev) => {
      Object.values(prev).forEach((streams) => {
        Object.values(streams).forEach((stream) => {
          stream?.getTracks()?.forEach((track) => track?.stop?.());
        });
      });

      return {};
    });
  }, []);

  return {
    remoteStreams,
    addRemoteStream,
    removeRemoteStream,
    clearRemoteStreamsForUser,
    clearRemoteStreams
  };
};

export { useRemoteStreams };
