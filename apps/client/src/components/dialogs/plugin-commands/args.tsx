import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { TCommandInfo } from '@sharkord/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TArgsProps = {
  selectedCommandInfo: TCommandInfo;
  commandArgs: Record<string, unknown>;
  handleArgChange: (argName: string, value: string, type: string) => void;
};

const Args = memo(
  ({ selectedCommandInfo, commandArgs, handleArgChange }: TArgsProps) => {
    const { t } = useTranslation();

    return (
      <div className="space-y-4">
        {(selectedCommandInfo.args || []).map((arg) => (
          <Group
            key={arg.name}
            label={arg.name}
            description={`(${arg.type}) ${arg.description}`}
            required={arg.required}
          >
            {arg.type === 'boolean' ? (
              <Select
                value={
                  commandArgs[arg.name] !== undefined
                    ? String(commandArgs[arg.name])
                    : ''
                }
                onValueChange={(value) =>
                  handleArgChange(arg.name, value, arg.type)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('dialogs.pluginCommands.argBooleanPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">
                    {t('dialogs.pluginCommands.argTrue')}
                  </SelectItem>
                  <SelectItem value="false">
                    {t('dialogs.pluginCommands.argFalse')}
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={arg.type === 'number' ? 'number' : 'text'}
                value={
                  commandArgs[arg.name] !== undefined
                    ? String(commandArgs[arg.name])
                    : ''
                }
                onChange={(e) =>
                  handleArgChange(arg.name, e.target.value, arg.type)
                }
                placeholder={t('dialogs.pluginCommands.argInputPlaceholder', {
                  name: arg.name
                })}
              />
            )}
          </Group>
        ))}
      </div>
    );
  }
);

export { Args };
