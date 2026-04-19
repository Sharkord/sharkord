import { getErrorMessage } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { pluginData } from '../db/schema';
import { logger } from '../logger';

type PluginStatesMap = Record<string, boolean>;

class PluginStateStore {
  private pluginStates: PluginStatesMap = {};

  public loadAll = async () => {
    try {
      const rows = await db
        .select({
          pluginId: pluginData.pluginId,
          enabled: pluginData.enabled
        })
        .from(pluginData);

      this.pluginStates = rows.reduce<PluginStatesMap>((acc, row) => {
        acc[row.pluginId] = row.enabled;

        return acc;
      }, {});
    } catch (error) {
      logger.error('Failed to load plugin states: %s', getErrorMessage(error));

      this.pluginStates = {};
    }
  };

  private getPluginEnabledFromDb = async (pluginId: string) => {
    const rows = await db
      .select({ enabled: pluginData.enabled })
      .from(pluginData)
      .where(eq(pluginData.pluginId, pluginId));

    return rows[0]?.enabled ?? false;
  };

  public ensure = async (pluginId: string) => {
    if (this.pluginStates[pluginId] !== undefined) return;

    const enabled = await this.getPluginEnabledFromDb(pluginId);

    this.pluginStates[pluginId] = enabled;
  };

  public isEnabled = (pluginId: string): boolean => {
    return this.pluginStates[pluginId] ?? false;
  };

  public setEnabled = async (pluginId: string, enabled: boolean) => {
    this.pluginStates[pluginId] = enabled;

    await db
      .insert(pluginData)
      .values({ pluginId, enabled })
      .onConflictDoUpdate({
        target: pluginData.pluginId,
        set: { enabled }
      });
  };
}

export { PluginStateStore };
