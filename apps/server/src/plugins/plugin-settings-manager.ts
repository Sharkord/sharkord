import type { PluginSettings } from '@sharkord/plugin-sdk';
import type {
  TPluginSettingDefinition,
  TPluginSettingsResponse
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { pluginData } from '../db/schema';
import { eventBus } from './event-bus';
import type { PluginLogger } from './plugin-logger';
import type { PluginStateStore } from './plugin-state-store';

class PluginSettingsManager {
  private pluginLogger: PluginLogger;
  private stateStore: PluginStateStore;
  private settingDefinitions = new Map<string, TPluginSettingDefinition[]>();
  private settingValues = new Map<string, Record<string, unknown>>();
  private saveQueues = new Map<string, Promise<void>>();

  constructor(pluginLogger: PluginLogger, stateStore: PluginStateStore) {
    this.pluginLogger = pluginLogger;
    this.stateStore = stateStore;
  }

  private loadFromDb = async (
    pluginId: string
  ): Promise<Record<string, unknown>> => {
    const rows = await db
      .select()
      .from(pluginData)
      .where(eq(pluginData.pluginId, pluginId));

    if (rows.length > 0 && rows[0]!.settings) {
      return rows[0]!.settings;
    }

    return {};
  };

  private saveToDb = async (
    pluginId: string,
    values: Record<string, unknown>
  ) => {
    const enabled = this.stateStore.isEnabled(pluginId);

    await db
      .insert(pluginData)
      .values({ pluginId, enabled, settings: values })
      .onConflictDoUpdate({
        target: pluginData.pluginId,
        set: { settings: values }
      });
  };

  private enqueueSave = async (
    pluginId: string,
    values: Record<string, unknown>
  ): Promise<void> => {
    const nextValues = { ...values };
    const previous = this.saveQueues.get(pluginId) ?? Promise.resolve();

    const current = previous
      .catch(() => {
        // keep queue alive after previous failure
      })
      .then(() => this.saveToDb(pluginId, nextValues));

    this.saveQueues.set(pluginId, current);

    try {
      await current;
    } finally {
      if (this.saveQueues.get(pluginId) === current) {
        this.saveQueues.delete(pluginId);
      }
    }
  };

  public register = async (
    pluginId: string,
    definitions: readonly TPluginSettingDefinition[]
  ): Promise<PluginSettings> => {
    this.settingDefinitions.set(pluginId, [...definitions]);

    // load existing values from DB, merge with defaults
    const dbValues = await this.loadFromDb(pluginId);
    const merged: Record<string, unknown> = {};

    for (const def of definitions) {
      merged[def.key] =
        dbValues[def.key] !== undefined ? dbValues[def.key] : def.defaultValue;
    }

    this.settingValues.set(pluginId, merged);

    // persist merged values back (in case new defaults were added)
    await this.enqueueSave(pluginId, merged);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Registered ${definitions.length} setting(s): ${definitions.map((d) => d.key).join(', ')}`
    );

    return {
      get: (key: string) => {
        const values = this.settingValues.get(pluginId);
        if (!values) return undefined;
        return values[key];
      },
      set: (key: string, value: unknown) => {
        const values = this.settingValues.get(pluginId);
        if (!values) return;

        const def = this.settingDefinitions
          .get(pluginId)
          ?.find((d) => d.key === key);
        if (!def) {
          this.pluginLogger.log(
            pluginId,
            'error',
            `Setting key '${key}' is not registered.`
          );
          return;
        }

        values[key] = value;

        this.enqueueSave(pluginId, values)
          .finally(() => {
            eventBus.emit('setting:set', { key, value });
          })
          .catch((err) => {
            this.pluginLogger.log(
              pluginId,
              'error',
              `Failed to persist setting '${key}':`,
              err
            );
          });
      }
    };
  };

  public getSettings = async (
    pluginId: string
  ): Promise<TPluginSettingsResponse> => {
    const definitions = this.settingDefinitions.get(pluginId) || [];
    let values = this.settingValues.get(pluginId);

    if (!values) {
      // plugin might not be loaded, try reading from DB
      const dbValues = await this.loadFromDb(pluginId);
      values = {};

      for (const def of definitions) {
        values[def.key] =
          dbValues[def.key] !== undefined
            ? dbValues[def.key]
            : def.defaultValue;
      }
    }

    return { definitions, values };
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

    const def = definitions.find((d) => d.key === key);

    if (!def) {
      throw new Error(
        `Setting '${key}' is not registered for plugin '${pluginId}'.`
      );
    }

    const values = this.settingValues.get(pluginId) || {};
    values[key] = value;
    this.settingValues.set(pluginId, values);

    await this.enqueueSave(pluginId, values);

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
    this.saveQueues.delete(pluginId);
  };
}

export { PluginSettingsManager };
