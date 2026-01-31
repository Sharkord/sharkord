import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { usePluginCommands } from '@/features/server/plugins/hooks';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { Play } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';
import { Args } from './args';
import { CommandsList } from './commands-list';
import { Helpers } from './helpers';
import { Response } from './response';
import type { TCommandResponse } from './types';

type TPluginCommandsDialogProps = TDialogBaseProps & {
  pluginId: string;
};

const PluginCommandsDialog = memo(
  ({ isOpen, close, pluginId }: TPluginCommandsDialogProps) => {
    const commandsMap = usePluginCommands();
    const [selectedCommand, setSelectedCommand] = useState<string>('');
    const [commandArgs, setCommandArgs] = useState<Record<string, unknown>>({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [commandResponse, setCommandResponse] =
      useState<TCommandResponse | null>(null);

    const availableCommands = useMemo(() => {
      return commandsMap[pluginId] || [];
    }, [commandsMap, pluginId]);

    const selectedCommandInfo = useMemo(() => {
      return availableCommands.find((cmd) => cmd.name === selectedCommand);
    }, [availableCommands, selectedCommand]);

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

          return {
            ...prev,
            [argName]: parsedValue
          };
        });
      },
      []
    );

    const handleExecute = useCallback(async () => {
      if (!pluginId || !selectedCommand) return;

      setIsExecuting(true);
      setCommandResponse(null);

      try {
        const trpc = getTRPCClient();

        const response = await trpc.plugins.executeCommand.mutate({
          pluginId,
          commandName: selectedCommand,
          args: commandArgs
        });

        setCommandResponse({
          success: true,
          data: response
        });

        toast.success(`Command '${selectedCommand}' executed successfully`);
      } catch (error) {
        const errorMessage = getTrpcError(error, 'Failed to execute command');

        setCommandResponse({
          success: false,
          error: errorMessage
        });

        toast.error(errorMessage);
      } finally {
        setIsExecuting(false);
      }
    }, [pluginId, selectedCommand, commandArgs]);

    const canExecute = useMemo(() => {
      if (!selectedCommandInfo) return false;

      if (selectedCommandInfo.args) {
        for (const arg of selectedCommandInfo.args) {
          if (arg.required && !commandArgs[arg.name]) {
            return false;
          }
        }
      }

      return true;
    }, [selectedCommandInfo, commandArgs]);

    return (
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className="flex flex-col min-w-[90vw] h-[85vh] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Available Commands For {pluginId}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            <CommandsList
              availableCommands={availableCommands}
              handleCommandChange={handleCommandChange}
              selectedCommand={selectedCommand}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
              {!selectedCommandInfo ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Select a command to execute</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-2xl">
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-2">
                          {selectedCommandInfo.name}
                        </h2>
                        {selectedCommandInfo.description && (
                          <p className="text-sm text-muted-foreground">
                            {selectedCommandInfo.description}
                          </p>
                        )}
                      </div>

                      {selectedCommandInfo.args &&
                      selectedCommandInfo.args.length > 0 ? (
                        <Args
                          selectedCommandInfo={selectedCommandInfo}
                          commandArgs={commandArgs}
                          handleArgChange={handleArgChange}
                        />
                      ) : (
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <p className="text-sm text-muted-foreground">
                            This command does not require any arguments.
                          </p>
                        </div>
                      )}

                      {commandResponse && (
                        <Response response={commandResponse} />
                      )}
                    </div>
                  </div>

                  <div className="border-t p-4 bg-muted/30">
                    <div className="flex justify-start gap-4">
                      <Button variant="outline" onClick={close}>
                        Close
                      </Button>
                      <Button
                        onClick={handleExecute}
                        disabled={!canExecute || isExecuting}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {isExecuting ? 'Executing...' : 'Execute Command'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Helpers />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

PluginCommandsDialog.displayName = 'PluginCommandsDialog';

export { PluginCommandsDialog };
