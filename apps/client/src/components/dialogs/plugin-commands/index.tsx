import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, type TCommandInfo } from '@sharkord/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@sharkord/ui';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';
import { CommandArgs } from './args';
import { CommandsList } from './commands-list';
import { CommandResponse } from './response';

type TPluginCommandsDialogProps = TDialogBaseProps & {
  pluginId: string;
};

const PluginCommandsDialog = memo(
  ({ isOpen, close, pluginId }: TPluginCommandsDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [commands, setCommands] = useState<TCommandInfo[]>([]);
    const [selectedCommand, setSelectedCommand] = useState<TCommandInfo | null>(
      null
    );
    const [argValues, setArgValues] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [response, setResponse] = useState<string | null>(null);

    const fetchCommands = useCallback(async () => {
      setLoading(true);

      try {
        const trpc = getTRPCClient();
        const result = await trpc.plugins.getCommands.query({ pluginId });
        setCommands(result[pluginId] ?? []);
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to load plugin commands'));
      } finally {
        setLoading(false);
      }
    }, [pluginId]);

    useEffect(() => {
      if (isOpen) fetchCommands();
    }, [isOpen, fetchCommands]);

    const handleSelectCommand = useCallback((cmd: TCommandInfo) => {
      setSelectedCommand(cmd);
      setArgValues({});
      setResponse(null);
    }, []);

    const handleExecute = useCallback(async () => {
      if (!selectedCommand) return;

      setExecuting(true);
      setResponse(null);

      try {
        const trpc = getTRPCClient();
        const result = await trpc.plugins.executeCommand.mutate({
          pluginId,
          commandName: selectedCommand.name,
          args: argValues
        });

        setResponse(result != null ? String(result) : null);
        toast.success(t('commandSuccess', { command: selectedCommand.name }));
      } catch (error) {
        toast.error(getTrpcError(error, t('commandFailed')));
      } finally {
        setExecuting(false);
      }
    }, [selectedCommand, pluginId, argValues, t]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          onInteractOutside={close}
          close={close}
          className="max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>{t('commandsTitle', { pluginId })}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 min-h-[300px]">
            <CommandsList
              commands={commands}
              loading={loading}
              selectedCommand={selectedCommand}
              onSelect={handleSelectCommand}
            />

            <div className="flex-1 flex flex-col gap-3">
              {!selectedCommand ? (
                <p className="text-sm text-muted-foreground">
                  {t('selectCommandToExecute')}
                </p>
              ) : (
                <>
                  <CommandArgs
                    command={selectedCommand}
                    argValues={argValues}
                    onChange={setArgValues}
                  />
                  <CommandResponse response={response} />
                </>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleExecute}
              disabled={!selectedCommand || executing}
            >
              {executing ? t('executingBtn') : t('executeCommandBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { PluginCommandsDialog };
