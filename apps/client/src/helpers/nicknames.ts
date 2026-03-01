import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from './storage';

type NicknameMap = Record<number, string>;

const getNicknameMap = (): NicknameMap => {
  return getLocalStorageItemAsJSON<NicknameMap>(LocalStorageKey.NICKNAMES, {})!;
};

const getNickname = (userId: number): string | null => {
  const map = getNicknameMap();
  return map[userId] ?? null;
};

const setNickname = (userId: number, nickname: string): void => {
  const map = getNicknameMap();
  map[userId] = nickname;
  setLocalStorageItemAsJSON(LocalStorageKey.NICKNAMES, map);
};

const removeNickname = (userId: number): void => {
  const map = getNicknameMap();
  delete map[userId];
  setLocalStorageItemAsJSON(LocalStorageKey.NICKNAMES, map);
};

export { getNickname, setNickname, removeNickname };
