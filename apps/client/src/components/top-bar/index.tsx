import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { SearchDialog } from '@/components/search-dialog';
import { Button, Tooltip } from '@sharkord/ui';
import { PanelRight, PanelRightClose, Search } from 'lucide-react';
import { memo, useState } from 'react';
import { VoiceOptionsController } from './voice-options-controller';
import { VolumeController } from './volume-controller';

type TTopBarProps = {
  onToggleRightSidebar: () => void;
  isOpen: boolean;
};

const TopBar = memo(
  ({
    onToggleRightSidebar,
    isOpen
  }: TTopBarProps) => {
    const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
    const currentVoiceChannelId = useCurrentVoiceChannelId();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    return (
      <div className="hidden lg:flex h-8 w-full bg-card border-b border-border items-center justify-end px-4 transition-all duration-300 ease-in-out gap-2">
        {isCurrentVoiceChannelSelected && currentVoiceChannelId && (
          <>
            <VoiceOptionsController />
            <VolumeController channelId={currentVoiceChannelId} />
          </>
        )}
        <Tooltip content="Search Messages">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
            className="h-6 px-2 transition-all duration-200 ease-in-out mr-auto"
          >
            <Search className="w-4 h-4" />
          </Button>
        </Tooltip>
        <SearchDialog
          open={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRightSidebar}
          className="h-6 px-2 transition-all duration-200 ease-in-out"
        >
          {isOpen ? (
            <Tooltip content="Close Members Sidebar">
              <div>
                <PanelRightClose className="w-4 h-4 transition-transform duration-200 ease-in-out" />
              </div>
            </Tooltip>
          ) : (
            <Tooltip content="Open Members Sidebar">
              <div>
                <PanelRight className="w-4 h-4 transition-transform duration-200 ease-in-out" />
              </div>
            </Tooltip>
          )}
        </Button>
      </div>
    );
  }
);

export { TopBar };
