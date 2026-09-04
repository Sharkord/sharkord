import { createContext } from 'react';

export const VOICE_USER_DND_MIME = 'application/x-sharkord-user-id';

export const categoryDndId = (categoryId: number) => `category:${categoryId}`;

export const channelDndId = (channelId: number) => `channel:${channelId}`;

export const categoryDropDndId = (categoryId: number) =>
  `category-drop:${categoryId}`;

export type TSidebarDragData =
  | { type: 'category'; categoryId: number }
  | { type: 'channel'; channelId: number; categoryId: number }
  | { type: 'category-drop'; categoryId: number };

export type TChannelDragPreview = {
  channelId: number;
  categoryId: number;
  index: number;
};

export const ChannelDragPreviewContext =
  createContext<TChannelDragPreview | null>(null);

export const applyChannelDragPreview = (
  channelIds: number[],
  categoryId: number,
  preview: TChannelDragPreview | null
) => {
  if (!preview) {
    return channelIds;
  }

  const withoutDraggedChannel = channelIds.filter(
    (channelId) => channelId !== preview.channelId
  );

  if (preview.categoryId !== categoryId) {
    return withoutDraggedChannel;
  }

  withoutDraggedChannel.splice(preview.index, 0, preview.channelId);

  return withoutDraggedChannel;
};
