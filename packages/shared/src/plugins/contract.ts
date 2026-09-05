/** the payload and the answer of every action a plugin's client half can call */
export type TActionContract = Record<
  string,
  { payload: unknown; response: unknown }
>;

/** the args and the answer of every slash command a plugin registers */
export type TCommandContract = Record<
  string,
  { args: unknown; response: unknown }
>;

/**
 * What a plugin declares about itself, written once and read by both halves.
 *
 * ```ts
 * export type TSharkord = {
 *   actions: { roll: { payload: { sides: number }; response: number } };
 *   commands: { roll: { args: { sides: number }; response: string } };
 *   push: { rolled: number };
 *   userData: { lastRoll: number };
 * };
 * ```
 *
 * The server reads it through `PluginContext<TSharkord>`, the client through
 * `createCallAction<TSharkord>()`, `usePush<TSharkord>()` and
 * `useUserData<TSharkord>()`.
 *
 * Every key is optional and an omitted one stays as loose as it is today, so a
 * plugin can type its commands and leave the rest alone, or declare nothing at
 * all and pass no contract.
 */
export type TPluginContract = {
  actions?: TActionContract;
  commands?: TCommandContract;
  /** what `ctx.push` sends and `usePush` receives */
  push?: unknown;
  /** the per-user object behind `ctx.userData` and `useUserData` */
  userData?: Record<string, unknown>;
};

export type TContractActions<C extends TPluginContract> =
  C['actions'] extends TActionContract ? C['actions'] : TActionContract;

export type TContractCommands<C extends TPluginContract> =
  C['commands'] extends TCommandContract ? C['commands'] : TCommandContract;

export type TContractPush<C extends TPluginContract> = C['push'];

export type TContractUserData<C extends TPluginContract> =
  C['userData'] extends Record<string, unknown>
    ? C['userData']
    : Record<string, unknown>;
