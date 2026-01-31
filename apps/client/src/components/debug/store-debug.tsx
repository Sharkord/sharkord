import type { IRootState } from '@/features/store';
import { logDebug } from '@/helpers/browser-logger';
import { useSelector } from 'react-redux';

const StoreDebug = () => {
  const server = useSelector((state: IRootState) => state.server);

  logDebug('Server State', server);

  return null;
};

export { StoreDebug };
