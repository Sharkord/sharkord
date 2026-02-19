import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { isEmptyMessage } from '@sharkord/shared';
import { useOwnUserId } from '@/features/server/users/hooks';

// defines the key for a draft message, channel/chat id
type TDraftMessageKey = string;

type TDraftMessages = Record<TDraftMessageKey, string>;

const loadDraftsFromStorage = (): TDraftMessages => {
  try {
    return (
      getLocalStorageItemAsJSON<TDraftMessages>(
        LocalStorageKey.DRAFT_MESSAGES
      ) ?? {}
    );
  } catch {
    return {};
  }
};

const saveDraftsToStorage = (drafts: TDraftMessages) => {
  try {
    setLocalStorageItemAsJSON(LocalStorageKey.DRAFT_MESSAGES, drafts);
  } catch {
    // ignore
  }
};

const getDraftMessage = (draftKey: TDraftMessageKey): string => {
  return loadDraftsFromStorage()[draftKey] ?? '';
}

const setDraftMessage = (draftKey: TDraftMessageKey, message: string) => {
  const drafts = loadDraftsFromStorage();

  if (isEmptyMessage(message)) {
    delete drafts[draftKey];
  } else {
    drafts[draftKey] = message;
  }

  saveDraftsToStorage(drafts);
};

const clearDraftMessage = (draftKey: TDraftMessageKey) => {
  const drafts = loadDraftsFromStorage();
  delete drafts[draftKey];
  saveDraftsToStorage(drafts);
};

const getChannelDraftKey = (channelId: number): TDraftMessageKey => `ch-${channelId}-${useOwnUserId()}` as TDraftMessageKey;

export {
  getChannelDraftKey,
  clearDraftMessage,
  setDraftMessage,
  getDraftMessage,
  loadDraftsFromStorage
};