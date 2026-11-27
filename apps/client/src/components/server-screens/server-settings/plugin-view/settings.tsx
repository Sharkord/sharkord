import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useReferenceableChannels } from '@/features/server/hooks';
import { useRoles } from '@/features/server/roles/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  isMultipleSetting,
  isReferenceSetting,
  type TPluginSettingDefinition
} from '@sharkord/shared';
import {
  Group,
  Input,
  MultiSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SettingsSection,
  Switch,
  Textarea,
  type TMultiSelectOption
} from '@sharkord/ui';
import { memo, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type TPluginSettingValues = Record<string, unknown>;

type TOptionsFieldProps = {
  definition: TPluginSettingDefinition;
  value: unknown;
  options: readonly TMultiSelectOption[];
  onChange: (key: string, value: unknown) => void;
};

type TFieldProps = Omit<TOptionsFieldProps, 'options'>;

const EMPTY_OPTIONS: TMultiSelectOption[] = [];
const NONE_VALUE = '0';

const OptionsField = memo(
  ({ definition, value, options, onChange }: TOptionsFieldProps) => {
    const { t } = useTranslation('settings');
    const isReference = isReferenceSetting(definition);
    const noneLabel = definition.noneLabel || t('settingNoneOption');

    const parse = useCallback(
      (raw: string) => (isReference ? Number(raw) : raw),
      [isReference]
    );

    const handleSelect = useCallback(
      (selected: string) => onChange(definition.key, parse(selected)),
      [onChange, definition.key, parse]
    );

    const handleMultiChange = useCallback(
      (selected: string[]) => onChange(definition.key, selected.map(parse)),
      [onChange, definition.key, parse]
    );

    const selected = useMemo(
      () => (Array.isArray(value) ? value.map(String) : []),
      [value]
    );

    const singleOptions = useMemo(
      () =>
        isReference
          ? [{ value: NONE_VALUE, label: noneLabel }, ...options]
          : options,
      [isReference, options, noneLabel]
    );

    if (isMultipleSetting(definition)) {
      return (
        <MultiSelect
          className="max-w-xs"
          options={options}
          value={selected}
          onChange={handleMultiChange}
          placeholder={noneLabel}
        />
      );
    }

    let singleValue = String(value ?? '');

    if (isReference && !value) {
      singleValue = NONE_VALUE;
    }

    return (
      <Select value={singleValue} onValueChange={handleSelect}>
        <SelectTrigger className="max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {singleOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);

const ChannelField = memo((props: TFieldProps) => {
  const channels = useReferenceableChannels();

  const options = useMemo(
    () =>
      channels.map((channel) => ({
        value: String(channel.id),
        label: channel.name
      })),
    [channels]
  );

  return <OptionsField {...props} options={options} />;
});

const RoleField = memo((props: TFieldProps) => {
  const roles = useRoles();

  const options = useMemo(
    () => roles.map((role) => ({ value: String(role.id), label: role.name })),
    [roles]
  );

  return <OptionsField {...props} options={options} />;
});

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
        <OptionsField
          definition={definition}
          value={value}
          options={definition.options ?? EMPTY_OPTIONS}
          onChange={onChange}
        />
      );
    } else if (definition.type === 'channel') {
      field = (
        <ChannelField
          definition={definition}
          value={value}
          onChange={onChange}
        />
      );
    } else if (definition.type === 'role') {
      field = (
        <RoleField definition={definition} value={value} onChange={onChange} />
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
            value: value as string | number | boolean | string[] | number[]
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
