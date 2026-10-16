import { useSelector } from 'react-redux';
import { visibleDirectMessagesSelector } from './selectors';

export const useVisibleDirectMessages = () =>
  useSelector(visibleDirectMessagesSelector);
