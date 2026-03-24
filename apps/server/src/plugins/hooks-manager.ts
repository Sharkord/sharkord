import type { TBeforeFileSaveHook } from '@sharkord/shared';

class HooksManager {
  private beforeFileSaveHooks = new Map<string, TBeforeFileSaveHook[]>();

  public registerBeforeFileSave = (
    pluginId: string,
    handler: TBeforeFileSaveHook
  ) => {
    const existing = this.beforeFileSaveHooks.get(pluginId) ?? [];

    existing.push(handler);

    this.beforeFileSaveHooks.set(pluginId, existing);
  };

  public clearBeforeFileSaveHooks = () => {
    this.beforeFileSaveHooks.clear();
  };

  public getBeforeFileSaveHooks = (): Array<{
    pluginId: string;
    handlers: TBeforeFileSaveHook[];
  }> => {
    const entries = Array.from(this.beforeFileSaveHooks.entries());

    return entries.map(([pluginId, handlers]) => ({ pluginId, handlers }));
  };

  public unload = (pluginId: string) => {
    this.beforeFileSaveHooks.delete(pluginId);
  };
}

export { HooksManager };
