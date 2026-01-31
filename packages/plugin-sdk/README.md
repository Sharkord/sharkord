# Sharkord Plugin SDK

The official SDK for building Sharkord plugins. This package provides TypeScript types and interfaces to extend Sharkord with custom functionality.

> [!NOTE]
> Sharkord plugins are an experimental feature and the SDK API may change in future releases.

## Creating a Plugin

### 1. Create Plugin Directory

Create a plugin folder, e.g., `my-plugin`.

### 2. Initialize Package

Run `bun init` to bootstrap your plugin.

### 3. Edit `package.json`

Make sure your `package.json` includes the necessary fields.

**Required fields:**

- `name`: Plugin identifier
- `version`: Semver version (e.g., `1.0.0`)
- `sharkord.entry`: Entry file (must be `.js`)
- `sharkord.author`: Plugin author name
- `sharkord.description`: Brief description

**Optional fields:**

- `sharkord.homepage`: Plugin website/repository URL
- `sharkord.logo`: Logo image filename

Example `package.json`:

```json
{
  "name": "my-plugin",
  "version": "0.0.1",
  "module": "src/index.ts",
  "sharkord": {
    "entry": "index.js",
    "author": "Me",
    "homepage": "https://some-page.com",
    "description": "This is my first Sharkord plugin!",
    "logo": "https://some-page.com/logo.png"
  },
  "type": "module",
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target bun --minify --format esm && cp package.json dist/"
  },
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5"
  }
}
```

### 4. Install SDK

```bash
bun add @sharkord/plugin-sdk
```

> [!NOTE]
> The SDK is not published to any package registry. For now, you need to link it locally using `bun link`.

### 3. Edit Entry File

```typescript
import type { PluginContext } from "@sharkord/plugin-sdk";

const onLoad = (ctx: PluginContext) => {
  ctx.log("My Plugin loaded");

  ctx.events.on("user:joined", ({ userId, username }) => {
    ctx.log(`User joined: ${username} (ID: ${userId})`);
  });
};

const onUnload = (ctx: PluginContext) => {
  ctx.log("My Plugin unloaded");
};

export { onLoad, onUnload };
```

Compile to JavaScript before loading:

```bash
bun run build
```

## Lifecycle

### onLoad

Called when the plugin is loaded. This is where you should:

- Register event listeners
- Register commands
- Initialize resources
- Set up external connections

### onUnload

Called when the plugin is unloaded or the server shuts down. Use this to:

- Clean up resources
- Close connections
- Save state

**Note:** All event listeners and commands are automatically unregistered when the plugin unloads.

## Commands

Plugins can register custom commands that users can execute. Commands can accept arguments and return results.

### Registering a Command

```typescript
import type { PluginContext, TInvokerContext } from "@sharkord/plugin-sdk";

const onLoad = (ctx: PluginContext) => {
  ctx.commands.register({
    name: "greet",
    description: "Greet a user",
    args: [
      {
        name: "username",
        type: "string",
        description: "The user to greet",
        required: true,
        sensitive: false, // set to true if the argument is sensitive (e.g., passwords), in the interface it will be shown as ****
      },
    ],
    async executes(invokerCtx: TInvokerContext, args: { username: string }) {
      ctx.log(`Greeting ${args.username} invoked by user ${invokerCtx.userId}`);

      return "Hello, " + args.username + "!";
    },
  });
};
```

## Adding The Plugin to Sharkord

1. Go to the Sharkord data directory (usually `~/.config/sharkord`).
2. Create a `plugins` folder if it doesn't exist.
3. Create a folder for your plugin (e.g., `my-plugin`).
4. Copy your compiled plugin files (e.g., from `dist/`) into the `my-plugin` folder.
5. Enable your plugin in the server settings under the "Plugins" section.
6. Restart Sharkord or reload plugins from the admin panel.
7. Your plugin should now be loaded and active!

## Best Practices

1. **Always handle errors**: Wrap async operations in try-catch blocks
2. **Clean up resources**: Implement `onUnload` to prevent memory leaks
3. **Use TypeScript**: Get type safety and better IDE support
4. **Log appropriately**: Use `debug` for verbose info, `error` for failures
5. **Validate inputs**: Check command arguments before using them
6. **Version carefully**: Follow semver for plugin updates
7. **Prevent blocking operations**: Do NOT block the event loop with long-running tasks (example: using Bun.spawnSync). Use asynchronous methods instead.

## API Reference

No documentation available yet. Use the types in `packages/plugin-sdk/src/index.ts` as a reference.

## License

This SDK is part of the Sharkord project. See the main repository for license information.
