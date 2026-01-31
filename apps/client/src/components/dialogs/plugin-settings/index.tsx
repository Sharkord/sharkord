import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Spinner from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TPluginSettingDefinition } from '@sharkord/shared';
import { Save, Settings } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TPluginSettingsDialogProps = TDialogBaseProps & {
  pluginId: string;
  pluginName: string;
};

type TSettingsListProps = {
  definitions: TPluginSettingDefinition[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  dirtyKeys: Set<string>;
};

const SettingsList = memo(
  ({ definitions, selectedKey, onSelect, dirtyKeys }: TSettingsListProps) => {
    return (
      <div className="w-80 border-r flex flex-col">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Settings</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {definitions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No settings available for this plugin
            </div>
          ) : (
            <div className="p-2">
              {definitions.map((def) => (
                <button
                  key={def.key}
                  onClick={() => onSelect(def.key)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                    'hover:bg-muted',
                    selectedKey === def.key &&
                      'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{def.name}</div>
                    {dirtyKeys.has(def.key) && (
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          selectedKey === def.key
                            ? 'text-primary-foreground/80'
                            : 'text-primary'
                        )}
                      >
                        Edited
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      'text-xs mt-1',
                      selectedKey === def.key
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    )}
                  >
                    {def.type}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

const PluginSettingsDialog = memo(
  ({ isOpen, close, pluginId, pluginName }: TPluginSettingsDialogProps) => {
    const [loading, setLoading] = useState(true);
    const [definitions, setDefinitions] = useState<TPluginSettingDefinition[]>(
      []
    );
    const [initialValues, setInitialValues] = useState<Record<string, unknown>>(
      {}
    );
    const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      if (!isOpen) return;

      const fetchSettings = async () => {
        setLoading(true);

        const trpc = getTRPCClient();

        try {
          const result = await trpc.plugins.getSettings.query({ pluginId });

          setDefinitions(result.definitions);
          setInitialValues(result.values);
          setDraftValues(result.values);
          setSelectedKey(result.definitions[0]?.key ?? null);
        } catch (error) {
          toast.error(getTrpcError(error, 'Failed to load plugin settings'));
        } finally {
          setLoading(false);
        }
      };

      fetchSettings();
    }, [isOpen, pluginId]);

    const selectedSetting = useMemo(() => {
      return definitions.find((def) => def.key === selectedKey) || null;
    }, [definitions, selectedKey]);

    const dirtyKeys = useMemo(() => {
      const changed = new Set<string>();

      for (const def of definitions) {
        const currentValue = draftValues[def.key];
        const initialValue = initialValues[def.key];

        if (def.type === 'number') {
          const parsed =
            currentValue === '' || currentValue === undefined
              ? NaN
              : Number(currentValue);
          if (Number.isNaN(parsed)) {
            if (initialValue !== undefined) {
              changed.add(def.key);
            }
            continue;
          }
          if (parsed !== initialValue) {
            changed.add(def.key);
          }
        } else if (def.type === 'boolean') {
          if (Boolean(currentValue) !== Boolean(initialValue)) {
            changed.add(def.key);
          }
        } else if (String(currentValue ?? '') !== String(initialValue ?? '')) {
          changed.add(def.key);
        }
      }

      return changed;
    }, [definitions, draftValues, initialValues]);

    const handleDraftChange = useCallback((key: string, value: unknown) => {
      setDraftValues((prev) => ({ ...prev, [key]: value }));
    }, []);

    const renderSettingInput = useCallback(
      (def: TPluginSettingDefinition) => {
        const currentValue = draftValues[def.key];
        const inputId = `setting-${def.key}`;

        switch (def.type) {
          case 'boolean':
            return (
              <Switch
                id={inputId}
                checked={Boolean(currentValue)}
                onCheckedChange={(checked) =>
                  handleDraftChange(def.key, checked)
                }
              />
            );
          case 'number':
            return (
              <Input
                id={inputId}
                type="number"
                value={currentValue !== undefined ? String(currentValue) : ''}
                onChange={(e) => handleDraftChange(def.key, e.target.value)}
                className="max-w-xs"
              />
            );
          case 'string':
          default:
            return (
              <Textarea
                id={inputId}
                value={String(currentValue ?? '')}
                onChange={(e) => handleDraftChange(def.key, e.target.value)}
                className="max-w-md"
              />
            );
        }
      },
      [draftValues, handleDraftChange]
    );

    const handleSave = useCallback(async () => {
      if (isSaving || dirtyKeys.size === 0) return;

      setIsSaving(true);

      try {
        const trpc = getTRPCClient();
        const updates: Record<string, string | number | boolean> = {};

        for (const def of definitions) {
          if (!dirtyKeys.has(def.key)) continue;

          const rawValue = draftValues[def.key];

          if (def.type === 'number') {
            const parsed =
              rawValue === '' || rawValue === undefined
                ? NaN
                : Number(rawValue);

            if (Number.isNaN(parsed)) {
              throw new Error(`${def.name} must be a number`);
            }

            updates[def.key] = parsed;
          } else if (def.type === 'boolean') {
            updates[def.key] = Boolean(rawValue);
          } else {
            updates[def.key] = String(rawValue ?? '');
          }
        }

        for (const [key, value] of Object.entries(updates)) {
          await trpc.plugins.updateSetting.mutate({
            pluginId,
            key,
            value
          });
        }

        setInitialValues((prev) => ({ ...prev, ...updates }));
        setDraftValues((prev) => ({ ...prev, ...updates }));

        toast.success('Settings saved');
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to save settings'));
      } finally {
        setIsSaving(false);
      }
    }, [isSaving, dirtyKeys, definitions, draftValues, pluginId]);

    return (
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className="flex flex-col min-w-[90vw] h-[85vh] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Settings for {pluginName}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <Spinner size="sm" />
            </div>
          ) : definitions.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No configurable settings</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              <SettingsList
                definitions={definitions}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                dirtyKeys={dirtyKeys}
              />

              <div className="flex-1 flex flex-col overflow-hidden">
                {!selectedSetting ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg">Select a setting to edit</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="max-w-2xl">
                        <div className="mb-6">
                          <h2 className="text-xl font-semibold mb-2">
                            {selectedSetting.name}
                          </h2>
                          {selectedSetting.description && (
                            <p className="text-sm text-muted-foreground">
                              {selectedSetting.description}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            Key: {selectedSetting.key}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`setting-${selectedSetting.key}`}>
                            Value
                          </Label>
                          {renderSettingInput(selectedSetting)}
                        </div>
                      </div>
                    </div>

                    <div className="border-t p-4 bg-muted/30">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-xs text-muted-foreground">
                          {dirtyKeys.size > 0
                            ? `${dirtyKeys.size} unsaved change${
                                dirtyKeys.size === 1 ? '' : 's'
                              }`
                            : 'No unsaved changes'}
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={close}>
                            Close
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={dirtyKeys.size === 0 || isSaving}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }
);

PluginSettingsDialog.displayName = 'PluginSettingsDialog';

export { PluginSettingsDialog };
