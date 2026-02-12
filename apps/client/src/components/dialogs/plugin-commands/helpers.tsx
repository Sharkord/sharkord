import {
  useCurrentVoiceChannelId,
  useSelectedChannelId
} from '@/features/server/channels/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const Helpers = memo(() => {
  const { t } = useTranslation();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const selectedChannelId = useSelectedChannelId();
  const ownUserId = useOwnUserId();

  return (
    <div className="w-80 border-l flex flex-col">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">
          {t('dialogs.pluginCommands.helpersTitle')}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t('dialogs.pluginCommands.helpersDescription')}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t('dialogs.pluginCommands.yourUserId')}
            </span>
            <div className="mt-1 px-3 py-2 rounded-md bg-muted font-mono text-sm break-all">
              {ownUserId ?? (
                <span className="text-muted-foreground italic">
                  {t('dialogs.pluginCommands.notLoaded')}
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t('dialogs.pluginCommands.currentVoiceChannelId')}
            </span>
            <div className="mt-1 px-3 py-2 rounded-md bg-muted font-mono text-sm break-all">
              {currentVoiceChannelId ?? (
                <span className="text-muted-foreground italic">
                  {t('dialogs.pluginCommands.notInVoiceChannel')}
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t('dialogs.pluginCommands.selectedChannelId')}
            </span>
            <div className="mt-1 px-3 py-2 rounded-md bg-muted font-mono text-sm break-all">
              {selectedChannelId ?? (
                <span className="text-muted-foreground italic">
                  {t('dialogs.pluginCommands.noChannelSelected')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export { Helpers };
