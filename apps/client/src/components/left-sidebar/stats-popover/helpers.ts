import { filesize } from 'filesize';

export type TEncoderKind = 'gpu' | 'cpu' | 'unknown';

const HARDWARE_ENCODERS = [
  'external',
  'hardware',
  'nvenc',
  'vaapi',
  'videotoolbox',
  'qsv',
  'amf',
  'mediacodec',
  'mediafoundation',
  'd3d12'
];

const SOFTWARE_ENCODERS = ['libvpx', 'openh264', 'libaom', 'software'];

export const getEncoderKind = (implementation: string): TEncoderKind => {
  const lower = implementation.toLowerCase();

  if (HARDWARE_ENCODERS.some((name) => lower.includes(name))) return 'gpu';

  if (SOFTWARE_ENCODERS.some((name) => lower.includes(name))) return 'cpu';

  return 'unknown';
};

export const getCodecLabel = (codec: string) => {
  const parts = codec.split('/');

  return parts.length > 1 ? parts[1] : codec;
};

export const formatRate = (bytesPerSecond: number) =>
  `${filesize(bytesPerSecond)}/s`;
