import { getStreamQualityMetadataLabel } from '@/components/channel-view/voice/quality-options';
import { useIsOwnUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import type { StreamKind } from '@sharkord/shared';
import { useMemo } from 'react';

const useStreamQualityData = (streamId: number, kind: StreamKind) => {
  const isOwnUser = useIsOwnUser(streamId);
  const { getStreamQuality, getStreamQualityLayers, isSimulcastConsumer } =
    useVoice();

  return useMemo(() => {
    const isSimulcastScreenConsumer =
      !isOwnUser && isSimulcastConsumer(streamId, kind);

    const quality = getStreamQuality(streamId, kind);
    const qualityLayers = getStreamQualityLayers(streamId, kind);
    const layers = getStreamQualityLayers(streamId, kind);

    const qualityLabel = isSimulcastScreenConsumer
      ? getStreamQualityMetadataLabel(quality, qualityLayers)
      : null;

    const orderedLayers = [...layers].sort(
      (a, b) => b.spatialLayer - a.spatialLayer
    );

    return {
      quality,
      qualityLabel,
      isSimulcastScreenConsumer,
      orderedLayers
    };
  }, [
    getStreamQuality,
    getStreamQualityLayers,
    isOwnUser,
    isSimulcastConsumer,
    streamId,
    kind
  ]);
};

export { useStreamQualityData };
