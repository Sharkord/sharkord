import { Permission, type PluginCapabilityType } from '@sharkord/shared';
import { useSelector } from 'react-redux';
import type { IRootState } from '../../store';
import { useCan } from '../hooks';
import { canUsePluginCapabilitySelector } from '../selectors';
import { usePluginId } from './plugin-id-context';

const usePluginCanUse = (type: PluginCapabilityType, name: string) => {
  const pluginId = usePluginId();
  const can = useCan();

  const canUseCapability = useSelector((state: IRootState) =>
    canUsePluginCapabilitySelector(state, pluginId ?? '', type, name)
  );

  return can(Permission.USE_PLUGINS) && canUseCapability;
};

export { usePluginCanUse };
