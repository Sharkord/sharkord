/**
 * How a setting is rendered and validated in the admin form.
 *
 * `secret` is write only: it renders as a password field and its value is never
 * sent back to the client, so an admin can replace it but not read it. `enum`
 * renders a select and requires `options`.
 */
export type TPluginSettingType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'secret'
  | 'enum';

/** One choice of an `enum` setting: `value` is stored, `label` is shown. */
export type TPluginSettingOption = {
  value: string;
  label: string;
};

/**
 * One server-wide setting, edited by admins in the plugin's settings tab.
 *
 * ```ts
 * const settings = await ctx.settings.register([
 *   { key: 'apiKey', name: 'API key', type: 'secret', defaultValue: '' },
 *   {
 *     key: 'mode',
 *     name: 'Mode',
 *     type: 'enum',
 *     defaultValue: 'fast',
 *     options: [
 *       { value: 'fast', label: 'Fast' },
 *       { value: 'thorough', label: 'Thorough' }
 *     ]
 *   }
 * ] as const);
 *
 * settings.get('mode'); // typed from the definitions above
 * ```
 */
export type TPluginSettingDefinition = {
  /** how you read it back, and how it is stored. stable across versions */
  key: string;
  /** the label in the admin form */
  name: string;
  description?: string;
  type: TPluginSettingType;
  /** used until an admin saves something, so a plugin always reads a value */
  defaultValue: string | number | boolean;
  /** required for `enum`, ignored otherwise */
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
