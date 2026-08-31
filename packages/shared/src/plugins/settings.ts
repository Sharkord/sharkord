export type TPluginSettingType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'secret'
  | 'enum';

export type TPluginSettingOption = {
  value: string;
  label: string;
};

export type TPluginSettingDefinition = {
  key: string;
  name: string;
  description?: string;
  type: TPluginSettingType;
  defaultValue: string | number | boolean;
  options?: TPluginSettingOption[];
};

export type TPluginSettingsResponse = {
  definitions: TPluginSettingDefinition[];
  values: Record<string, unknown>;
  secretsSet: string[];
};

const isSecretSetting = (definition: TPluginSettingDefinition) =>
  definition.type === 'secret';

const getSettingValueError = (
  definition: TPluginSettingDefinition,
  value: unknown
): string | undefined => {
  if (definition.type === 'enum') {
    const allowed = (definition.options ?? []).map((option) => option.value);

    if (typeof value !== 'string' || !allowed.includes(value)) {
      return `Setting '${definition.key}' expects one of: ${allowed.join(', ')}.`;
    }

    return undefined;
  }

  const expected = definition.type === 'secret' ? 'string' : definition.type;

  if (typeof value !== expected) {
    return `Setting '${definition.key}' expects a ${expected}, received ${typeof value}.`;
  }

  return undefined;
};

export { getSettingValueError, isSecretSetting };
