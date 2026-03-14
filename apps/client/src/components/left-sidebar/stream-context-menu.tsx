import { UserAvatar } from '@/components/user-avatar';
import { useStreamVolumeControl } from '@/components/voice-provider/hooks/use-stream-volume-control';
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  Slider
} from '@sharkord/ui';
import { Router, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type TUserContextMenuProps = {
  type: 'user';
  userId: number;
  name: string;
};

type TExternalContextMenuProps = {
  type: 'external';
  pluginId: string;
  streamKey: string;
  title: string;
  avatarUrl?: string;
};

type TStreamContextMenuProps = {
  children: ReactNode;
} & (TUserContextMenuProps | TExternalContextMenuProps);

const StreamContextMenu = (props: TStreamContextMenuProps) => {
  const { t } = useTranslation('sidebar');

  const { volume, isMuted, setVolume, toggleMute } = useStreamVolumeControl(
    props.type === 'user'
      ? { type: 'user', userId: props.userId }
      : {
          type: 'external',
          pluginId: props.pluginId,
          streamKey: props.streamKey
        }
  );

  const header = useMemo(() => {
    if (props.type === 'user') {
      return (
        <>
          <UserAvatar
            userId={props.userId}
            className="h-6 w-6"
            showUserPopover={false}
            showStatusBadge={false}
          />
          <span className="text-sm truncate flex-1">{props.name}</span>
        </>
      );
    }

    return (
      <>
        {props.avatarUrl ? (
          <img
            src={props.avatarUrl}
            alt={props.title}
            className="h-6 w-6 rounded object-cover"
          />
        ) : (
          <Router className="h-6 w-6 text-muted-foreground" />
        )}
        <span className="text-sm truncate flex-1">{props.title}</span>
      </>
    );
  }, [props]);

  return (
    <ContextMenu>
      <ContextMenuTrigger>{props.children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 mb-3">
            {header}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-6 w-6 p-0"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Slider
            value={[volume]}
            onValueChange={([val]) => setVolume(val ?? 0)}
            min={0}
            max={100}
            step={1}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t('userVolume')}
            </span>
            <span className="text-xs text-muted-foreground">{volume}%</span>
          </div>
        </div>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export { StreamContextMenu };
