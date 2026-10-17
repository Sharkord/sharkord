import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@sharkord/ui';
import { Trash2Icon } from 'lucide-react';
import { memo, useCallback, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import defaultLogo from '../../build/icon.png';
import type { TServer } from '../shared/types';

type TServerButtonProps = {
  server: TServer;
  selected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

const ServerButton = memo(
  ({ server, selected, onSelect, onRemove }: TServerButtonProps) => {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleClick = useCallback(() => {
      onSelect(server.id);
    }, [onSelect, server.id]);

    const handleContextMenu = useCallback(async (event: MouseEvent) => {
      event.preventDefault();

      await window.desktop.setOverlay(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));

      setMenuOpen(true);
    }, []);

    const handleOpenChange = useCallback((open: boolean) => {
      if (open) {
        return;
      }

      setMenuOpen(false);
      window.desktop.setOverlay(false);
    }, []);

    const handleRemove = useCallback(() => {
      onRemove(server.id);
    }, [onRemove, server.id]);

    const shapeClass = selected ? 'rounded-2xl' : 'rounded-full';

    return (
      <div className="group relative flex w-full justify-center">
        <span
          className={cn(
            'bg-foreground absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full transition-all',
            selected ? 'h-10' : 'h-2 group-hover:h-5'
          )}
        />
        <DropdownMenu open={menuOpen} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={server.name}
              onClick={handleClick}
              onContextMenu={handleContextMenu}
            >
              <Avatar
                className={cn(
                  'size-12 transition-[border-radius] group-hover:rounded-2xl',
                  shapeClass
                )}
              >
                <AvatarImage src={server.iconUrl ?? undefined} />
                <AvatarFallback className={cn('bg-card', shapeClass)}>
                  <img src={defaultLogo} alt="" className="size-full p-1.5" />
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem variant="destructive" onClick={handleRemove}>
              <Trash2Icon />
              {t('removeServer')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);

export { ServerButton };
