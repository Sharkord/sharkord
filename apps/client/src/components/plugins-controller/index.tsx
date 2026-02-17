import { setPluginsLoading } from '@/features/app/actions';
import {
  processPluginComponents,
  setPluginComponents
} from '@/features/server/plugins/actions';
import { getUrlFromServer } from '@/helpers/get-file-url';
import type { TSlotsMapListByPlugin } from '@sharkord/shared';
import { memo, useCallback, useEffect } from 'react';

export type TPluginsController = {
  loading: boolean;
};

const PluginsController = memo(() => {
  const fetchPlugins = useCallback(async () => {
    try {
      const response = await fetch(`${getUrlFromServer()}/plugin-components`);

      if (!response.ok) {
        throw new Error(`Failed to fetch plugins: ${response.statusText}`);
      }

      const slotsMap = (await response.json()) as TSlotsMapListByPlugin;
      const components = await processPluginComponents(slotsMap);

      setPluginComponents(components);
    } catch (error) {
      console.error('Error fetching plugins:', error);
    } finally {
      setPluginsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  return null;
});

export { PluginsController };
