import {
  useIsConnected,
  useServerName,
  useTotalUnreadCount
} from '@/features/server/hooks';
import { useEffect } from 'react';
import { getDocumentTitle } from '../helpers';

const useDocumentTitle = () => {
  const isConnected = useIsConnected();
  const serverName = useServerName();
  const unreadCount = useTotalUnreadCount();

  useEffect(() => {
    document.title = getDocumentTitle(isConnected, serverName, unreadCount);
  }, [isConnected, serverName, unreadCount]);
};

export { useDocumentTitle };
