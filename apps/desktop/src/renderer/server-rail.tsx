import type { TDesktopUnreadState } from '@sharkord/shared';
import { Button, Separator } from '@sharkord/ui';
import { PanelLeftCloseIcon, PlusIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { RAIL_WIDTH } from '../shared/constants';
import type { TServer } from '../shared/types';
import { ServerButton } from './server-button';

type TServerRailProps = {
  servers: TServer[];
  selectedId: string | null;
  unread: Record<string, TDesktopUnreadState>;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onHide: () => void;
};

const ServerRail = memo(
  ({
    servers,
    selectedId,
    unread,
    onSelect,
    onRemove,
    onAdd,
    onHide
  }: TServerRailProps) => {
    const { t } = useTranslation();

    return (
      <nav
        className="bg-sidebar flex shrink-0 flex-col items-center gap-3 overflow-y-auto py-3"
        style={{ width: RAIL_WIDTH }}
      >
        {servers.map((server) => (
          <ServerButton
            key={server.id}
            server={server}
            selected={server.id === selectedId}
            unread={unread[server.id]}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        ))}
        <Separator className="w-8" />
        <Button
          variant="secondary"
          size="icon"
          className="size-12 rounded-full"
          title={t('addServerTooltip')}
          onClick={onAdd}
        >
          <PlusIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="mt-auto"
          title={t('hideServerList')}
          onClick={onHide}
        >
          <PanelLeftCloseIcon />
        </Button>
      </nav>
    );
  }
);

export { ServerRail };
