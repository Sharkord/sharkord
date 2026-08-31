import type { TBeforeFileSaveHook } from '@sharkord/shared';
import { HOOK_EXECUTION_TIMEOUT_MS, withTimeout } from './execution-timeout';

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

  // hooks run inline on the upload path, so a handler that never settles would
  // block every upload on the server. errors still propagate: rejecting a file
  // is what a hook is for
  public getBeforeFileSaveHooks = (): Array<{
    pluginId: string;
    handlers: TBeforeFileSaveHook[];
  }> =>
    Array.from(this.beforeFileSaveHooks.entries()).map(
      ([pluginId, handlers]) => ({
        pluginId,
        handlers: handlers.map(
          (handler): TBeforeFileSaveHook =>
            (payload) =>
              withTimeout(
                Promise.resolve().then(() => handler(payload)),
                HOOK_EXECUTION_TIMEOUT_MS,
                `beforeFileSave hook from plugin '${pluginId}' exceeded timeout of ${HOOK_EXECUTION_TIMEOUT_MS}ms`
              )
        )
      })
    );

  public unload = (pluginId: string) => {
    this.beforeFileSaveHooks.delete(pluginId);
  };
}

export { HooksManager };
