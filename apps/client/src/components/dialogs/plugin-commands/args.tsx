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
                  <SelectValue placeholder="Select value..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
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
                placeholder={`Enter ${arg.name}...`}
              />
            )}
          </Group>
        ))}
      </div>
    );
  }
);

export { Args };
