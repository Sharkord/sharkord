import { SettingsListEditor } from '@/components/server-screens/settings-shell/list-editor';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import {
  useCurrentVoiceChannelId,
  useSelectedChannelId
} from '@/features/server/channels/hooks';
import { usePluginCommands } from '@/features/server/plugins/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { getTrpcError, type TCommandInfo } from '@sharkord/shared';
import { Button, Group } from '@sharkord/ui';
import { Play, Terminal } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Args } from './args';
import { Response } from './response';
import type { TCommandResponse } from './types';

type TCommandItemProps = {
  command: TCommandInfo;
  isSelected: boolean;
  onSelect: (commandName: string) => void;
};

const CommandItem = memo(
  ({ command, isSelected, onSelect }: TCommandItemProps) => {
    const handleClick = useCallback(
      () => onSelect(command.name),
      [onSelect, command.name]
    );

    return (
      <button
        onClick={handleClick}
        className={cn(
          'w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
          isSelected && 'bg-accent'
        )}
      >
        <div className="font-medium">{command.name}</div>
        {command.description && (
          <div className="mt-1 text-xs text-muted-foreground">
            {command.description}
          </div>
        )}
      </button>
    );
  }
);

const HelperValues = memo(() => {
  const { t } = useTranslation('settings');
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const selectedChannelId = useSelectedChannelId();
  const ownUserId = useOwnUserId();

  return (
    <SettingsSection
      title={t('helperValuesTitle')}
      description={t('helperValuesDesc')}
    >
      <Group label={t('ownUserIdLabel')}>
        <span className="font-mono text-sm">{ownUserId ?? '-'}</span>
      </Group>
      <Group label={t('currentVoiceChannelIdLabel')}>
        <span className="font-mono text-sm">
          {currentVoiceChannelId ?? '-'}
        </span>
      </Group>
      <Group label={t('selectedChannelIdLabel')}>
        <span className="font-mono text-sm">{selectedChannelId ?? '-'}</span>
      </Group>
    </SettingsSection>
  );
});

type TPluginCommandsProps = {
  pluginId: string;
};

const PluginCommands = memo(({ pluginId }: TPluginCommandsProps) => {
  const { t } = useTranslation('settings');
  const commandsMap = usePluginCommands();
  const [selectedCommand, setSelectedCommand] = useState('');
  const [commandArgs, setCommandArgs] = useState<Record<string, unknown>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandResponse, setCommandResponse] =
    useState<TCommandResponse | null>(null);

  const availableCommands = useMemo(
    () => commandsMap[pluginId] || [],
    [commandsMap, pluginId]
  );

  const selectedCommandInfo = useMemo(
    () => availableCommands.find((cmd) => cmd.name === selectedCommand),
    [availableCommands, selectedCommand]
  );

  const handleCommandChange = useCallback((commandName: string) => {
    setSelectedCommand(commandName);
    setCommandArgs({});
    setCommandResponse(null);
  }, []);

  const handleArgChange = useCallback(
    (argName: string, value: string, type: string) => {
      setCommandArgs((prev) => {
        let parsedValue: unknown = value;

        if (type === 'number') {
          parsedValue = value === '' ? undefined : Number(value);
        } else if (type === 'boolean') {
          parsedValue = value === 'true';
        }

        return { ...prev, [argName]: parsedValue };
      });
    },
    []
  );

  const handleExecute = useCallback(async () => {
    if (!selectedCommand) return;

    setIsExecuting(true);
    setCommandResponse(null);

    try {
      const trpc = getTRPCClient();

      const response = await trpc.plugins.executeCommand.mutate({
        pluginId,
        commandName: selectedCommand,
        args: commandArgs
      });

      setCommandResponse({ success: true, data: response });
      toast.success(t('commandSuccess', { command: selectedCommand }));
    } catch (error) {
      const errorMessage = getTrpcError(error, t('failedExecuteCommand'));

      setCommandResponse({ success: false, error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  }, [pluginId, selectedCommand, commandArgs, t]);

  const canExecute = useMemo(() => {
    if (!selectedCommandInfo) return false;

    return (selectedCommandInfo.args ?? []).every(
      (arg) => !arg.required || commandArgs[arg.name]
    );
  }, [selectedCommandInfo, commandArgs]);

  return (
    <>
      <SettingsListEditor
        emptyIcon={Terminal}
        emptyTitle={t('selectCommandToExecute')}
        list={
          <SettingsSection title={t('commandsTitle')}>
            <div className="space-y-1">
              {availableCommands.map((command) => (
                <CommandItem
                  key={command.name}
                  command={command}
                  isSelected={command.name === selectedCommand}
                  onSelect={handleCommandChange}
                />
              ))}
            </div>
          </SettingsSection>
        }
        editor={
          selectedCommandInfo && (
            <SettingsSection
              className="flex-1"
              title={selectedCommandInfo.name}
              description={selectedCommandInfo.description}
              action={
                <Button
                  onClick={handleExecute}
                  disabled={!canExecute || isExecuting}
                >
                  <Play className="h-4 w-4" />
                  {isExecuting ? t('executingBtn') : t('executeCommandBtn')}
                </Button>
              }
            >
              {selectedCommandInfo.args?.length ? (
                <Args
                  selectedCommandInfo={selectedCommandInfo}
                  commandArgs={commandArgs}
                  handleArgChange={handleArgChange}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('noArgsRequired')}
                </p>
              )}

              {commandResponse && <Response response={commandResponse} />}
            </SettingsSection>
          )
        }
      />

      <HelperValues />
    </>
  );
});

export { PluginCommands };
