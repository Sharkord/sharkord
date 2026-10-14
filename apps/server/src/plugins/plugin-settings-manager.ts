import type { PluginSettings } from '@sharkord/plugin-sdk';
import {
  getSettingValueError,
  isReferenceSetting,
  isSecretSetting,
  type TPluginSettingDefinition,
  type TPluginSettingsResponse
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { getRole } from '../db/queries/roles';
import { pluginData } from '../db/schema';
import { invariant } from '../utils/invariant';
import { getPluginChannel } from './actions/write-plugin-channels';
import { eventBus } from './event-bus';
import type { PluginLogger } from './plugin-logger';
import type { PluginStateStore } from './plugin-state-store';

class PluginSettingsManager {
  private settingDefinitions = new Map<string, TPluginSettingDefinition[]>();
  private settingValues = new Map<string, Record<string, unknown>>();

  constructor(
    private readonly pluginLogger: PluginLogger,
    private readonly stateStore: PluginStateStore
  ) {}

  private loadFromDb = async (
    pluginId: string
  ): Promise<Record<string, unknown>> => {
    const row = await db
      .select({ settings: pluginData.settings })
      .from(pluginData)
      .where(eq(pluginData.pluginId, pluginId))
      .limit(1)
      .get();

    return row?.settings ?? {};
  };

  private saveToDb = async (
    pluginId: string,
    values: Record<string, unknown>
  ) => {
    await db
      .insert(pluginData)
      .values({
        pluginId,
        enabled: this.stateStore.isEnabled(pluginId),
        settings: values
      })
      .onConflictDoUpdate({
        target: pluginData.pluginId,
        set: { settings: values }
      });
  };

  private mergeWithDefaults = (
    definitions: readonly TPluginSettingDefinition[],
    dbValues: Record<string, unknown>
  ): Record<string, unknown> => {
    const merged: Record<string, unknown> = {};

    for (const definition of definitions) {
      merged[definition.key] =
        dbValues[definition.key] !== undefined
          ? dbValues[definition.key]
          : definition.defaultValue;
    }

    return merged;
  };

  // `0` is the unset default and points at nothing
  private assertReferenceExists = async (
    definition: TPluginSettingDefinition,
    value: number
  ) => {
    if (value === 0) return;

    if (definition.type === 'channel') {
      const channel = await getPluginChannel(value);

      invariant(channel && !channel.isDm, {
        code: 'NOT_FOUND',
        message: 'Channel not found.'
      });

      return;
    }

    const role = await getRole(value);

    invariant(role, {
      code: 'NOT_FOUND',
      message: 'Role not found.'
    });
  };

  private setValue = async (pluginId: string, key: string, value: unknown) => {
    const values = { ...this.settingValues.get(pluginId), [key]: value };

    this.settingValues.set(pluginId, values);

    await this.saveToDb(pluginId, values);

    eventBus.emitTo(pluginId, 'setting:set', { key, value });
  };

  public register = async (
    pluginId: string,
    definitions: readonly TPluginSettingDefinition[]
  ): Promise<PluginSettings> => {
    this.settingDefinitions.set(pluginId, [...definitions]);

    const merged = this.mergeWithDefaults(
      definitions,
      await this.loadFromDb(pluginId)
    );

    this.settingValues.set(pluginId, merged);

    // persisted back so a newly added default exists in the database too
    await this.saveToDb(pluginId, merged);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Registered ${definitions.length} setting(s): ${definitions.map((d) => d.key).join(', ')}`
    );

    return {
      get: (key: string) => this.settingValues.get(pluginId)?.[key],
      set: (key: string, value: unknown) => {
        const definition = this.settingDefinitions
          .get(pluginId)
          ?.find((d) => d.key === key);

        if (!definition) {
          this.pluginLogger.log(
            pluginId,
            'error',
            `Setting key '${key}' is not registered.`
          );

          return;
        }

        const valueError = getSettingValueError(definition, value);

        if (valueError) {
          this.pluginLogger.log(pluginId, 'error', valueError);

          return;
        }

        this.setValue(pluginId, key, value).catch((error) => {
          this.pluginLogger.log(
            pluginId,
            'error',
            `Failed to persist setting '${key}':`,
            error
          );
        });
      }
    };
  };

  public getSettings = async (
    pluginId: string
  ): Promise<TPluginSettingsResponse> => {
    const definitions = this.settingDefinitions.get(pluginId) ?? [];

    const values =
      this.settingValues.get(pluginId) ??
      this.mergeWithDefaults(definitions, await this.loadFromDb(pluginId));

    return {
      definitions,
      ...this.withoutSecrets(definitions, values)
    };
  };

  private withoutSecrets = (
    definitions: TPluginSettingDefinition[],
    values: Record<string, unknown>
  ) => {
    const visible: Record<string, unknown> = { ...values };
    const secretsSet: string[] = [];

    for (const definition of definitions) {
      if (!isSecretSetting(definition)) continue;

      if (String(visible[definition.key] ?? '').length > 0) {
        secretsSet.push(definition.key);
      }

      delete visible[definition.key];
    }

    return { values: visible, secretsSet };
  };

  public updateSetting = async (
    pluginId: string,
    key: string,
    value: unknown
  ) => {
    const definitions = this.settingDefinitions.get(pluginId);

    if (!definitions) {
      throw new Error(`Plugin '${pluginId}' has no registered settings.`);
    }

    const definition = definitions.find((d) => d.key === key);

    if (!definition) {
      throw new Error(
        `Setting '${key}' is not registered for plugin '${pluginId}'.`
      );
    }

    const valueError = getSettingValueError(definition, value);

    if (valueError) {
      throw new Error(valueError);
    }

    if (isReferenceSetting(definition)) {
      await this.assertReferenceExists(definition, value as number);
    }

    await this.setValue(pluginId, key, value);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Setting '${key}' updated to:`,
      value
    );
  };

  public unload = (pluginId: string) => {
    this.settingDefinitions.delete(pluginId);
    this.settingValues.delete(pluginId);
  };
}

export { PluginSettingsManager };
