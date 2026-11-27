import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { usePublicServerSettings } from '@/features/server/hooks';
import { PluginSlot } from '@sharkord/shared';
import { IconButton, Tooltip } from '@sharkord/ui';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TMainContentContext } from './context';
import { ServerSearch } from './server-search';

type TMainActionsProps = Pick<
  TMainContentContext,
  'onToggleMembers' | 'isMembersOpen'
>;

const MainActions = memo(
  ({ onToggleMembers, isMembersOpen }: TMainActionsProps) => {
    const { t } = useTranslation('topbar');
    const settings = usePublicServerSettings();
    const membersLabel = isMembersOpen
      ? t('closeMembersSidebar')
      : t('openMembersSidebar');

    return (
      <>
        {settings?.enableSearch && <ServerSearch />}
        <PluginSlotRenderer slotId={PluginSlot.TOPBAR_RIGHT} />
        <Tooltip content={membersLabel}>
          <IconButton
            icon={isMembersOpen ? PanelRightClose : PanelRight}
            variant="ghost"
            size="sm"
            onClick={onToggleMembers}
            aria-label={membersLabel}
          />
        </Tooltip>
      </>
    );
  }
);

export { MainActions };
