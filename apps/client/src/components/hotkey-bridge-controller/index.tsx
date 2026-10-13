import { useHotkeysEnabled } from '@/features/app/hooks';
import { useServerId, useServerName } from '@/features/server/hooks';
import { createBridgeSource } from '@/lib/hotkeys/bridge-source';
import { hotkeys } from '@/lib/hotkeys/dispatcher';
import { memo, useEffect } from 'react';

const HotkeyBridgeController = memo(() => {
  const serverId = useServerId();
  const serverName = useServerName();
  const hotkeysEnabled = useHotkeysEnabled();

  useEffect(() => {
    if (!hotkeysEnabled || !serverId) {
      return;
    }

    hotkeys.setSource(
      createBridgeSource({ serverId, serverName: serverName ?? '' })
    );

    return () => {
      hotkeys.setSource(undefined);
    };
  }, [hotkeysEnabled, serverId, serverName]);

  return null;
});

export { HotkeyBridgeController };
