import { useContext } from 'react';
import { DevicesProviderContext } from '..';

const useDevices = () => {
  const context = useContext(DevicesProviderContext);

  if (!context) {
    throw new Error(
      'useDevices must be used within a DevicesProvider component'
    );
  }

  return context;
};

export { useDevices };
