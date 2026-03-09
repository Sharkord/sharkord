import { getTRPCClient } from '@/lib/trpc';
import type { TPluginSettingDefinition } from '@sharkord/shared';
import { getTrpcError } from '@sharkord/shared';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input
} from '@sharkord/ui';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TPluginSettingsDialogProps = TDialogBaseProps & {
  pluginId: string;
  pluginName?: string;
};

const PluginSettingsDialog = memo(
  ({ isOpen, close, pluginId, pluginName }: TPluginSettingsDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [definitions, setDefinitions] = useState<TPluginSettingDefinition[]>([]);
    const [values, setValues] = useState<Record<string, unknown>>({});
    const [editedValues, setEditedValues] = useState<Record<string, string | number | boolean>>({});
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchSettings = useCallback(async () => {
      setLoading(true);

      try {
        const trpc = getTRPCClient();
        const result = await trpc.plugins.getSettings.query({ pluginId });
        setDefinitions(result.definitions);
        setValues(result.values);
      } catch (error) {
        toast.error(getTrpcError(error, t('failedLoadPluginSettings')));
      } finally {
        setLoading(false);
      }
    }, [pluginId, t]);

    useEffect(() => {
      if (isOpen) fetchSettings();
    }, [isOpen, fetchSettings]);

    const dirtyKeys = useMemo(
      () =>
        new Set(
          Object.entries(editedValues)
            .filter(([key, value]) => values[key] !== value)
            .map(([key]) => key)
        ),
      [editedValues, values]
    );

    const handleSave = useCallback(async () => {
      setSaving(true);

      try {
        const trpc = getTRPCClient();

        for (const key of dirtyKeys) {
          await trpc.plugins.updateSetting.mutate({
            pluginId,
            key,
            value: editedValues[key] ?? ''
          });
        }

        toast.success(t('settingsSaved'));
        setEditedValues({});
        await fetchSettings();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedSaveSettings')));
      } finally {
        setSaving(false);
      }
    }, [dirtyKeys, editedValues, fetchSettings, pluginId, t]);

    const selectedDef = useMemo(
      () => definitions.find((d) => d.key === selectedKey) ?? null,
      [definitions, selectedKey]
    );

    const selectedValue = selectedKey
      ? String(editedValues[selectedKey] ?? values[selectedKey] ?? '')
      : '';

    const isSelectedDirty = selectedKey ? dirtyKeys.has(selectedKey) : false;

    return (
      <Dialog open={isOpen}>
        <DialogContent
          onInteractOutside={close}
          close={close}
          className="max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>
              {t('pluginSettingsTitle', { name: pluginName ?? pluginId })}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 min-h-[300px]">
            <div className="w-48 border-r pr-4 flex flex-col gap-1 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {t('settingsLabel')}
              </p>
              {loading ? (
                <p className="text-xs text-muted-foreground">
                  {t('noSettingsAvailable')}
                </p>
              ) : definitions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t('noConfigurableSettings')}
                </p>
              ) : (
                definitions.map((def) => (
                  <button
                    key={def.key}
                    type="button"
                    onClick={() => setSelectedKey(def.key)}
                    className={`text-left text-sm px-2 py-1 rounded flex items-center gap-1 ${
                      selectedKey === def.key
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="truncate flex-1">{def.name}</span>
                    {dirtyKeys.has(def.key) && (
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {t('editedLabel')}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="flex-1 flex flex-col gap-3">
              {!selectedDef ? (
                <p className="text-sm text-muted-foreground">
                  {t('selectSettingToEdit')}
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t('keyLabel', { key: selectedDef.key })}
                    </p>
                    {selectedDef.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedDef.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold">{t('valueLabel')}</p>
                    <Input
                      value={selectedValue}
                      onChange={(e) =>
                        setEditedValues((prev) => ({
                          ...prev,
                          [selectedKey!]: e.target.value
                        }))
                      }
                    />
                    {isSelectedDirty && (
                      <Badge
                        variant="secondary"
                        className="w-fit text-[10px] py-0"
                      >
                        {t('editedLabel')}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-auto">
              {dirtyKeys.size > 0
                ? t('unsavedChange', { count: dirtyKeys.size })
                : t('noUnsavedChanges')}
            </span>
            <Button variant="ghost" onClick={close}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || dirtyKeys.size === 0}
            >
              {saving ? t('savingBtn') : t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { PluginSettingsDialog };
