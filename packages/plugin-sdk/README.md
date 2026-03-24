# Sharkord Plugin SDK

Type-safe SDK for writing Sharkord server/client plugins.

## Manifest (`manifest.json`)

The plugin root must include:

- `manifest.json`
- `server/index.js`
- `client/index.js`

Manifest format:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "author": "You",
  "description": "Example Sharkord plugin",
  "version": "0.1.0",
  "sdkVersion": 1,
  "homepage": "https://example.com/my-plugin",
  "logo": "https://example.com/my-plugin/logo.png"
}
```

Notes:

- `id` must match the plugin directory name.
- `sdkVersion` must match the server SDK version.

## Quick Start

```ts
import type { PluginContext } from '@sharkord/plugin-sdk';

const onLoad = (ctx: PluginContext) => {
  ctx.logger.log('plugin loaded');

  const unsubscribe = ctx.events.on('user:joined', ({ username }) => {
    ctx.logger.debug(`joined: ${username}`);
  });

  // optional explicit cleanup before unload
  unsubscribe();
};

const onUnload = (ctx: PluginContext) => {
  ctx.logger.log('plugin unloaded');
};

export { onLoad, onUnload };
```

## Actions vs Commands

- `commands`: user-facing commands listed/executed by users (description, args).
- `actions`: programmatic RPC endpoints used by plugins/client integrations.

Use commands for UI-triggered features, actions for internal API-style calls.

## Server Context API

`PluginContext` exposes:

- `ctx.logger.log/debug/error` (plus top-level `ctx.log/debug/error` for compatibility)
- `ctx.events.on(event, handler)` and `ctx.events.off(event, handler)`
- `ctx.commands.register(...)`
- `ctx.actions.register(...)`
- `ctx.settings.register(definitions)`
- `ctx.messages.send/edit/delete(...)`
- `ctx.voice.getRouter/createStream/getListenInfo`
- `ctx.hooks.onBeforeFileSave(handler)`
- `ctx.data.getUser/getChannel/getMembers`
- `ctx.ui.enable()` / `ctx.ui.disable()`

`onUnload` receives the same context shape, so plugins can release external streams,
messages, and UI state during cleanup.

## Typed Helpers

### `createRegisterCommand`

```ts
import { createRegisterCommand } from '@sharkord/plugin-sdk';

type Commands = {
  greet: { args: { name: string }; response: string };
};

const onLoad = (ctx: PluginContext) => {
  const registerCommand = createRegisterCommand<Commands>(ctx);

  registerCommand(
    'greet',
    {
      description: 'Greets a user',
      args: [{ name: 'name', type: 'string', required: true }]
    },
    async (_invoker, args) => `Hello ${args.name}`
  );
};
```

### `createRegisterAction` / `createCallAction`

```ts
import { createCallAction, createRegisterAction } from '@sharkord/plugin-sdk';

type Actions = {
  ping: { payload: { value: string }; response: { ok: boolean } };
};

const register = createRegisterAction<Actions>(ctx);
register('ping', async (_invoker, payload) => ({ ok: payload.value.length > 0 }));

const call = createCallAction<Actions>(pluginStore.actions);
await call('ping', { value: 'hello' });
```

## Hooks

`ctx.hooks.onBeforeFileSave(handler)` receives `{ tempFile, userId, type }`.

- Return `string` to replace file path.
- Return `void` to keep original path.

`type` is `FileSaveType` (`MESSAGE`, `AVATAR`, `BANNER`, `EMOJI`, `SERVER_LOGO`).

## Client-side Types

- `TPluginStore` and `TPluginStoreState` describe client plugin state.
- `PluginSlot` lists supported UI mount slots.

## Packaging Notes

- Build plugin output as ESM JavaScript.
- Ship `manifest.json`, `server/index.js`, and `client/index.js` together.
- Keep plugin IDs stable across releases.
