import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { getDesktopApi } from '@/helpers/desktop-api';
import { useDesktopServerList } from '@/hooks/use-desktop-server-list';
import { PluginSlot } from '@sharkord/shared';
import { Button, IconButton, Tooltip } from '@sharkord/ui';
import {
  Menu,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Settings
} from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
import { OpenViewTitle } from './open-view-title';
import { ServerSearch } from './server-search';
import { VoiceButtons } from './voice-buttons';

type TTopBarProps = {
  onToggleRightSidebar: () => void;
  onOpenChannelList: () => void;
  isOpen: boolean;
};

const TopBar = memo(
  ({ onToggleRightSidebar, onOpenChannelList, isOpen }: TTopBarProps) => {
    const { t } = useTranslation('topbar');
    const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
    const currentVoiceChannelId = useCurrentVoiceChannelId();
    const settings = usePublicServerSettings();
    const {
      isDesktop,
      isVisible: isServerListVisible,
      toggle: toggleServerList
    } = useDesktopServerList();
    const desktopApi = getDesktopApi();
    const ServerListIcon = isServerListVisible ? PanelLeftClose : PanelLeft;
    const serverListLabel = isServerListVisible
      ? t('closeServerList')
      : t('openServerList');

    const handleOpenDesktopSettings = useCallback(() => {
      if (desktopApi) {
        desktopApi.openSettings();
      }
    }, [desktopApi]);

    return (
      <div className="flex h-12 w-full shrink-0 items-center gap-2 border-b border-border bg-card px-2 transition-all duration-300 ease-in-out lg:grid lg:grid-cols-[1fr_minmax(320px,1.4fr)_1fr] lg:px-4">
        <div className="flex min-w-0 items-center gap-2 max-md:flex-1">
          <IconButton
            icon={Menu}
            variant="ghost"
            className="h-9 w-9 md:hidden"
            onClick={onOpenChannelList}
            aria-label={t('openChannelList')}
          />
          <OpenViewTitle />
          {isDesktop && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleServerList}
                className="h-7 px-2 transition-all duration-200 ease-in-out"
              >
                <Tooltip content={serverListLabel}>
                  <div>
                    <ServerListIcon className="w-4 h-4 transition-transform duration-200 ease-in-out" />
                  </div>
                </Tooltip>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenDesktopSettings}
                className="h-7 px-2 transition-all duration-200 ease-in-out"
              >
                <Tooltip content={t('desktopSettings')}>
                  <div>
                    <Settings className="w-4 h-4" />
                  </div>
                </Tooltip>
              </Button>
            </>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-center md:flex-1">
          {settings?.enableSearch && <ServerSearch />}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-0.5 md:gap-2">
          <PluginSlotRenderer slotId={PluginSlot.TOPBAR_RIGHT} />
          {isCurrentVoiceChannelSelected && currentVoiceChannelId && (
            <VoiceButtons currentVoiceChannelId={currentVoiceChannelId} />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRightSidebar}
            className="h-9 px-2 transition-all duration-200 ease-in-out lg:h-7"
            aria-label={
              isOpen ? t('closeMembersSidebar') : t('openMembersSidebar')
            }
          >
            {isOpen ? (
              <Tooltip content={t('closeMembersSidebar')}>
                <div>
                  <PanelRightClose className="w-4 h-4 transition-transform duration-200 ease-in-out" />
                </div>
              </Tooltip>
            ) : (
              <Tooltip content={t('openMembersSidebar')}>
                <div>
                  <PanelRight className="w-4 h-4 transition-transform duration-200 ease-in-out" />
                </div>
              </Tooltip>
            )}
          </Button>
        </div>
      </div>
    );
  }
);

export { TopBar };
