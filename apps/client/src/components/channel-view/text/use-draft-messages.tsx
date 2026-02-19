import { ownUserIdSelector } from '@/features/server/users/selectors';
import { store } from '@/features/store';
import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { isEmptyMessage } from '@sharkord/shared';

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
};

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

const getChannelDraftKey = (channelId: number): TDraftMessageKey => {
  const state = store.getState();
  const ownUserId = ownUserIdSelector(state);

  return `ch-${channelId}-${ownUserId}`;
};

export {
  clearDraftMessage,
  getChannelDraftKey,
  getDraftMessage,
  loadDraftsFromStorage,
  setDraftMessage
};
