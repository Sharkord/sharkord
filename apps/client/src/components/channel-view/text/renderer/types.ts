import type { TMessageMetadata } from '@sharkord/shared';

export type TFoundMedia = {
  key: string;
  type: 'image' | 'video' | 'audio';
  url: string;
};

export type TFoundOpenGraph = {
  key: string;
  url: string;
  hostname: string;
  title?: string;
  siteName?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
};

export type TMessageMetadataLike = Partial<TMessageMetadata> & {
  kind?: TMessageMetadata['kind'];
  mediaType?: string;
  url?: string;
  title?: string;
  siteName?: string;
  description?: string;
  images?: string[];
  favicons?: string[];
};
