import type { TRemoteStreams, TRemoteUserStreamKinds } from '@/types';
import { useCallback, useState } from 'react';

const useRemoteStreams = () => {
  const [remoteUserStreams, setRemoteUserStreams] = useState<TRemoteStreams>(
    {}
  );
  const [externalStreams, setExternalStreams] = useState<{
    [streamId: number]: MediaStream;
  }>({});

  const addExternalStream = useCallback(
    (streamId: number, stream: MediaStream) => {
      setExternalStreams((prev) => {
        const newState = { ...prev };

        newState[streamId] = stream;

        return newState;
      });
    },
    []
  );

  const removeExternalStream = useCallback((streamId: number) => {
    setExternalStreams((prev) => {
      const streamToRemove = prev[streamId];

      if (streamToRemove) {
        streamToRemove?.getTracks()?.forEach((track) => track?.stop?.());
      }

      const newState = { ...prev };

      delete newState[streamId];

      return newState;
    });
  }, []);

  const clearExternalStreams = useCallback(() => {
    setExternalStreams((prev) => {
      Object.values(prev).forEach((stream) => {
        stream?.getTracks()?.forEach((track) => track?.stop?.());
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
    addExternalStream,
    removeExternalStream,
    clearExternalStreams,
    addRemoteUserStream,
    removeRemoteUserStream,
    clearRemoteUserStreamsForUser,
    clearRemoteUserStreams
  };
};

export { useRemoteStreams };
