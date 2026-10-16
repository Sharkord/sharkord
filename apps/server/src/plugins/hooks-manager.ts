import type {
  TBeforeChannelCreateHook,
  TBeforeFileSaveHook,
  TBeforeLoginHook,
  TBeforeMessageSaveHook,
  TBeforeVoiceJoinHook
} from '@sharkord/shared';
import { HOOK_EXECUTION_TIMEOUT_MS, withTimeout } from './execution-timeout';

type THookHandlers = {
  beforeFileSave: TBeforeFileSaveHook;
  beforeMessageSave: TBeforeMessageSaveHook;
  beforeChannelCreate: TBeforeChannelCreateHook;
  beforeVoiceJoin: TBeforeVoiceJoinHook;
  beforeLogin: TBeforeLoginHook;
};

type THookName = keyof THookHandlers;

type THookEntries<TName extends THookName> = Array<{
  pluginId: string;
  handlers: THookHandlers[TName][];
}>;

class HooksManager {
  private hooks = new Map<THookName, Map<string, THookHandlers[THookName][]>>();

  private byPlugin = <TName extends THookName>(name: TName) => {
    const existing = this.hooks.get(name);

    if (existing) return existing as Map<string, THookHandlers[TName][]>;

    const created = new Map<string, THookHandlers[TName][]>();

    this.hooks.set(name, created);

    return created;
  };

  public register = <TName extends THookName>(
    name: TName,
    pluginId: string,
    handler: THookHandlers[TName]
  ) => {
    const handlers = this.byPlugin(name);
    const existing = handlers.get(pluginId) ?? [];

    existing.push(handler);
    handlers.set(pluginId, existing);
  };

  public get = <TName extends THookName>(name: TName): THookEntries<TName> =>
    Array.from(this.byPlugin(name).entries()).map(([pluginId, handlers]) => ({
      pluginId,
      handlers: handlers.map((handler) => {
        const run = handler as (payload: never) => Promise<unknown>;

        return ((payload: never) =>
          withTimeout(
            Promise.resolve().then(() => run(payload)),
            HOOK_EXECUTION_TIMEOUT_MS,
            `${name} hook from plugin '${pluginId}' exceeded timeout of ${HOOK_EXECUTION_TIMEOUT_MS}ms`
          )) as THookHandlers[TName];
      })
    }));

  public clearAll = () => {
    this.hooks.clear();
  };

  public unload = (pluginId: string) => {
    for (const handlers of this.hooks.values()) {
      handlers.delete(pluginId);
    }
  };
}

export { HooksManager };
export type { THookHandlers, THookName };
