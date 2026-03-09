import type { TCommandInfo } from '@sharkord/shared';
import {
  Group,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TCommandArgsProps = {
  command: TCommandInfo;
  argValues: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
};

const CommandArgs = memo(({ command, argValues, onChange }: TCommandArgsProps) => {
  const { t } = useTranslation('dialogs');

  if (!command.args || command.args.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('noArgsRequired')}</p>
    );
  }

  return (
    <div className="space-y-3">
      {command.args.map((arg) => (
        <Group
          key={arg.name}
          label={arg.name}
          description={arg.description}
          required={arg.required}
        >
          {arg.type === 'boolean' ? (
            <Select
              value={String(argValues[arg.name] ?? '')}
              onValueChange={(value) =>
                onChange({ ...argValues, [arg.name]: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={arg.type === 'number' ? 'number' : 'text'}
              value={String(argValues[arg.name] ?? '')}
              onChange={(e) =>
                onChange({ ...argValues, [arg.name]: e.target.value })
              }
            />
          )}
        </Group>
      ))}
    </div>
  );
});

export { CommandArgs };
