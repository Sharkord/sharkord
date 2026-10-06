import type { IRootState } from '@/features/store';
import { useSelector } from 'react-redux';
import {
  customEmojiFileByNameSelector,
  customEmojisSelector
} from './selectors';

export const useCustomEmojis = () => useSelector(customEmojisSelector);

export const useCustomEmojiFile = (name: string) =>
  useSelector((state: IRootState) =>
    customEmojiFileByNameSelector(state, name)
  );
