import type { TPluginUserData } from '@sharkord/shared';
import { useCallback, useEffect, useState } from 'react';
import { usePluginId } from './plugin-id-context';
import { pluginActions } from './plugin-store';

const DEFAULT_DATA: Record<string, unknown> = {};

const usePluginUserData = (): TPluginUserData => {
  const pluginId = usePluginId();

  const [data, setData] = useState<Record<string, unknown>>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pluginId) {
      setLoading(false);

      return;
    }

    let cancelled = false;

    pluginActions
      .getUserData(pluginId)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setData(DEFAULT_DATA);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pluginId]);

  const save = useCallback(
    async (next: Record<string, unknown>) => {
      if (!pluginId) return;

      await pluginActions.setUserData(pluginId, next);

      setData(next);
    },
    [pluginId]
  );

  return { data, loading, save };
};

export { usePluginUserData };
