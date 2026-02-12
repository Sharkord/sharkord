import { cn } from '@/lib/utils';
import type { TCommandInfo } from '@sharkord/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TCommandsListProps = {
  availableCommands: TCommandInfo[];
  handleCommandChange: (commandName: string) => void;
  selectedCommand: string | null;
};

const CommandsList = memo(
  ({
    availableCommands,
    handleCommandChange,
    selectedCommand
  }: TCommandsListProps) => {
    const { t } = useTranslation();

    return (
      <div className="w-80 border-r flex flex-col">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">
            {t('dialogs.pluginCommands.commandListTitle')}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {availableCommands.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {t('dialogs.pluginCommands.commandListEmpty')}
            </div>
          ) : (
            <div className="p-2">
              {availableCommands.map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => handleCommandChange(cmd.name)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                    'hover:bg-muted',
                    selectedCommand === cmd.name &&
                      'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  <div className="font-medium">{cmd.name}</div>
                  {cmd.description && (
                    <div
                      className={cn(
                        'text-xs mt-1',
                        selectedCommand === cmd.name
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {cmd.description}
                    </div>
                  )}
                  {cmd.args && cmd.args.length > 0 && (
                    <div
                      className={cn(
                        'text-xs mt-1',
                        selectedCommand === cmd.name
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {cmd.args.length === 1
                        ? t('dialogs.pluginCommands.argumentsCount', {
                            count: cmd.args.length
                          })
                        : t('dialogs.pluginCommands.argumentsCountPlural', {
                            count: cmd.args.length
                          })}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export { CommandsList };
