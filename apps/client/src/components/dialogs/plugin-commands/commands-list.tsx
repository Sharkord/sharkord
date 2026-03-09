import { cn } from '@/lib/utils';
import type { TCommandInfo } from '@sharkord/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TCommandsListProps = {
  commands: TCommandInfo[];
  loading: boolean;
  selectedCommand: TCommandInfo | null;
  onSelect: (cmd: TCommandInfo) => void;
};

const CommandsList = memo(
  ({ commands, loading, selectedCommand, onSelect }: TCommandsListProps) => {
    const { t } = useTranslation('dialogs');

    return (
      <div className="w-48 border-r pr-4 flex flex-col gap-1 overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          {t('commandsLabel')}
        </p>
        {loading || commands.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('noCommandsAvailable')}
          </p>
        ) : (
          commands.map((cmd) => (
            <button
              key={cmd.name}
              type="button"
              onClick={() => onSelect(cmd)}
              className={cn(
                'text-left text-sm px-2 py-1 rounded flex flex-col',
                selectedCommand?.name === cmd.name
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50'
              )}
            >
              <span className="font-medium">{cmd.name}</span>
              {cmd.args && cmd.args.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t('argument', { count: cmd.args.length })}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    );
  }
);

export { CommandsList };
