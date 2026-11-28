import * as fileUrls from '@/helpers/get-file-url';
import type { TJoinedMessage } from '@sharkord/shared';
import { expect, spyOn, test } from 'bun:test';
import { extractMessageMedia } from '../media-cache';

test('keeps view once attachments out of cached media previews', () => {
  const getFileUrl = spyOn(fileUrls, 'getFileUrl');
  getFileUrl.mockReturnValue('/public/test.png');
  const message: TJoinedMessage = {
    id: 42,
    content: '',
    channelId: 1,
    userId: 1,
    createdAt: 1,
    updatedAt: null,
    parentMessageId: null,
    replyToMessageId: null,
    pluginId: null,
    pluginComponents: null,
    editable: true,
    editedAt: null,
    editedBy: null,
    pinned: false,
    pinnedAt: null,
    pinnedBy: null,
    reactions: [],
    files: [
      {
        id: 1,
        name: 'test.png',
        originalName: 'test.png',
        extension: '.png',
        mimeType: 'image/png',
        size: 42,
        md5: '',
        userId: 1,
        pluginId: null,
        createdAt: 1,
        updatedAt: null,
        viewOnce: false
      }
    ],
    metadata: []
  };

  try {
    expect(extractMessageMedia(message)).toHaveLength(1);
    message.files[0]!.viewOnce = true;
    expect(extractMessageMedia(message)).toEqual([]);
    expect(getFileUrl).toHaveBeenCalledTimes(1);
  } finally {
    getFileUrl.mockRestore();
  }
});
