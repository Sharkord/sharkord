import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { getTRPCClient } from '@/lib/trpc';
import type { TPluginSettingDefinition } from '@sharkord/shared';
import {
  Group,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea
} from '@sharkord/ui';
import { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type TPluginSettingValues = Record<string, unknown>;

type TSettingFieldProps = {
  definition: TPluginSettingDefinition;
  value: unknown;
  isSecretSet: boolean;
  onChange: (key: string, value: unknown) => void;
};

const SettingField = memo(
  ({ definition, value, isSecretSet, onChange }: TSettingFieldProps) => {
    const { t } = useTranslation('settings');
    const handleSwitch = useCallback(
      (checked: boolean) => onChange(definition.key, checked),
      [onChange, definition.key]
    );

    const handleInput = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const raw = e.target.value;

        onChange(definition.key, definition.type === 'number' ? +raw : raw);
      },
      [onChange, definition.key, definition.type]
    );

    const handleSelect = useCallback(
      (selected: string) => onChange(definition.key, selected),
      [onChange, definition.key]
    );

    let field = (
      <Textarea
        className="max-h-64 overflow-y-auto"
        value={String(value ?? '')}
        onChange={handleInput}
      />
    );

    if (definition.type === 'boolean') {
      field = (
        <Switch checked={Boolean(value)} onCheckedChange={handleSwitch} />
      );
    } else if (definition.type === 'number') {
      field = (
        <Input
          type="number"
          className="max-w-xs"
          value={value === undefined ? '' : String(value)}
          onChange={handleInput}
        />
      );
    } else if (definition.type === 'secret') {
      // the stored value never reaches the client, so an empty box means keep it
      field = (
        <Input
          type="password"
          autoComplete="new-password"
          className="max-w-md"
          placeholder={
            isSecretSet
              ? t('secretSetPlaceholder')
              : t('secretUnsetPlaceholder')
          }
          value={String(value ?? '')}
          onChange={handleInput}
        />
      );
    } else if (definition.type === 'enum') {
      field = (
        <Select value={String(value ?? '')} onValueChange={handleSelect}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(definition.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Group label={definition.name} description={definition.description}>
        {field}
      </Group>
    );
  }
);

type TPluginSettingsProps = {
  pluginId: string;
  definitions: TPluginSettingDefinition[];
  values: TPluginSettingValues;
  secretsSet: string[];
};

const PluginSettings = memo(
  ({
    pluginId,
    definitions,
    values: savedValues,
    secretsSet
  }: TPluginSettingsProps) => {
    const { t } = useTranslation('settings');
    // the saved values are the diff baseline, so only the keys the admin touched are written
    const savedRef = useRef(savedValues);

    const onSave = useCallback(
      async (values: TPluginSettingValues) => {
        const trpc = getTRPCClient();

        for (const definition of definitions) {
          const value = values[definition.key];

          if (value === savedRef.current[definition.key]) continue;
          if (definition.type === 'secret' && !String(value ?? '')) continue;

          await trpc.plugins.updateSetting.mutate({
            pluginId,
            key: definition.key,
            value: value as string | number | boolean
          });
        }

        savedRef.current = values;
      },
      [pluginId, definitions]
    );

    const { values, onChange } = useSettingsForm<TPluginSettingValues>({
      initialValues: savedValues,
      onSave,
      successMessage: t('pluginSettingsSaved'),
      errorMessage: t('failedSavePluginSettings')
    });

    const handleChange = useCallback(
      (key: string, value: unknown) => onChange(key, value),
      [onChange]
    );

    return (
      <SettingsSection
        title={t('pluginSettingsTitle')}
        description={t('pluginSettingsDesc')}
      >
        {definitions.map((definition) => (
          <SettingField
            key={definition.key}
            definition={definition}
            value={values[definition.key]}
            isSecretSet={secretsSet.includes(definition.key)}
            onChange={handleChange}
          />
        ))}
      </SettingsSection>
    );
  }
);

export { PluginSettings };
