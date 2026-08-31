import type { TCommandArg, TCommandInfo } from '@sharkord/shared';
import {
  Group,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TArgFieldProps = {
  arg: TCommandArg;
  value: unknown;
  onChange: (argName: string, value: string, type: string) => void;
};

const ArgField = memo(({ arg, value, onChange }: TArgFieldProps) => {
  const { t } = useTranslation('settings');

  const handleSelect = useCallback(
    (next: string) => onChange(arg.name, next, arg.type),
    [onChange, arg.name, arg.type]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(arg.name, e.target.value, arg.type),
    [onChange, arg.name, arg.type]
  );

  const stringValue = value === undefined ? '' : String(value);

  let field = (
    <Input
      type={arg.type === 'number' ? 'number' : 'text'}
      value={stringValue}
      onChange={handleInput}
      placeholder={t('argValuePlaceholder', { name: arg.name })}
    />
  );

  if (arg.type === 'boolean') {
    field = (
      <Select value={stringValue} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder={t('argSelectValuePlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">{t('argTrue')}</SelectItem>
          <SelectItem value="false">{t('argFalse')}</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Group
      label={arg.name}
      description={`(${arg.type}) ${arg.description ?? ''}`}
      required={arg.required}
    >
      {field}
    </Group>
  );
});

type TArgsProps = {
  selectedCommandInfo: TCommandInfo;
  commandArgs: Record<string, unknown>;
  handleArgChange: (argName: string, value: string, type: string) => void;
};

const Args = memo(
  ({ selectedCommandInfo, commandArgs, handleArgChange }: TArgsProps) => {
    return (
      <div className="space-y-4">
        {(selectedCommandInfo.args || []).map((arg) => (
          <ArgField
            key={arg.name}
            arg={arg}
            value={commandArgs[arg.name]}
            onChange={handleArgChange}
          />
        ))}
      </div>
    );
  }
);

export { Args };
