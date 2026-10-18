import { cn } from '@sharkord/ui';
import { memo, useCallback, useEffect, useState } from 'react';
import type { TServersState } from '../shared/types';
import { AddServerForm } from './add-server-form';
import { ServerRail } from './server-rail';

const App = memo(() => {
  const [state, setState] = useState<TServersState | null>(null);

  useEffect(() => {
    const load = async () => {
      const initial = await window.desktop.getState();

      setState(initial);
    };

    load();

    return window.desktop.onStateChange(setState);
  }, []);

  const handleSelect = useCallback((id: string) => {
    window.desktop.selectServer(id);
  }, []);

  const handleRemove = useCallback((id: string) => {
    window.desktop.removeServer(id);
  }, []);

  const handleAdd = useCallback(() => {
    window.desktop.setAdding(true);
  }, []);

  const handleCancelAdd = useCallback(() => {
    window.desktop.setAdding(false);
  }, []);

  const handleHideRail = useCallback(() => {
    window.desktop.setRailHidden(true);
  }, []);

  if (!state) {
    return null;
  }

  const { servers, selectedId, adding, railVisible, unread } = state;
  const hasServers = servers.length > 0;
  const showForm = adding || !hasServers;
  const mainClass = cn(
    'flex flex-1 items-center justify-center',
    showForm && 'bg-background'
  );

  return (
    <div className="flex h-screen">
      {railVisible && (
        <ServerRail
          servers={servers}
          selectedId={selectedId}
          unread={unread}
          onSelect={handleSelect}
          onRemove={handleRemove}
          onAdd={handleAdd}
          onHide={handleHideRail}
        />
      )}
      <main className={mainClass}>
        {showForm && (
          <AddServerForm canCancel={hasServers} onCancel={handleCancelAdd} />
        )}
      </main>
    </div>
  );
});

export { App };
