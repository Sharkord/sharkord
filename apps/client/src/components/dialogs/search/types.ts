import type { TFile, TJoinedMessage } from '@sharkord/shared';

export type TSearchResultMessage = TJoinedMessage & {
  plainContent: string;
  channelName: string;
  channelIsDm: boolean;
};

export type TSearchResultFile = {
  file: TFile;
  messageId: number;
  channelId: number;
  messageContent: string | null;
  messageCreatedAt: number;
  channelName: string;
  channelIsDm: boolean;
};

export type TUnifiedSearchResult =
  | {
      type: 'message';
      createdAt: number;
      key: string;
      item: TSearchResultMessage;
    }
  | {
      type: 'file';
      createdAt: number;
      key: string;
      item: TSearchResultFile;
    };

export type TSearchResults = {
  messages: TSearchResultMessage[];
  files: TSearchResultFile[];
  truncated: boolean;
};
