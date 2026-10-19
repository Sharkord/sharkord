import { useHotkeysEnabled } from '@/features/app/hooks';
import { useServerId, useServerName } from '@/features/server/hooks';
import { isDesktopApp } from '@/helpers/is-desktop-app';
import { createBridgeSource } from '@/lib/hotkeys/bridge-source';
import { createDesktopSource } from '@/lib/hotkeys/desktop-source';
import { hotkeys } from '@/lib/hotkeys/dispatcher';
import { memo, useEffect } from 'react';

const createSource = (serverId: string, serverName: string) => {
  if (isDesktopApp()) {
    return createDesktopSource();
  }

  return createBridgeSource({ serverId, serverName });
};

const HotkeySourceController = memo(() => {
  const serverId = useServerId();
  const serverName = useServerName();
  const hotkeysEnabled = useHotkeysEnabled();

  useEffect(() => {
    if (!hotkeysEnabled || !serverId) {
      return;
    }

    hotkeys.setSource(createSource(serverId, serverName ?? ''));

    return () => {
      hotkeys.setSource(undefined);
    };
  }, [hotkeysEnabled, serverId, serverName]);

  return null;
});

export { HotkeySourceController };
