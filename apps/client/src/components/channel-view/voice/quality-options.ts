import type { TStreamQuality } from '@/types';

type TQualityOption = {
  value: TStreamQuality;
  label: string;
};

const qualityOptions: TQualityOption[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const getStreamQualityMetadataLabel = (quality: TStreamQuality) => {
  return (
    qualityOptions
      .find((option) => option.value === quality)
      ?.value.toLowerCase() ?? quality
  );
};

const getStreamQualityLabel = (quality: TStreamQuality) => {
  return (
    qualityOptions.find((option) => option.value === quality)?.label ?? quality
  );
};

export { getStreamQualityLabel, getStreamQualityMetadataLabel, qualityOptions };
