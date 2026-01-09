import z from "zod";

export const zPluginPackageJson = z.object({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9-.]+)?$/, "Invalid version format"),
  name: z.string().min(1, "Package name is required"),
  sharkord: z.object({
    entry: z.string().endsWith(".js", "Plugin entry file must be a .js file"),
    author: z.string().min(1, "Plugin author is required"),
    homepage: z.url().optional(),
    description: z.string().min(1, "Plugin description is required"),
    logo: z.string().optional(),
    enabled: z.boolean().optional().default(true),
  }),
});

export type TPluginPackageJson = z.infer<typeof zPluginPackageJson>;

export type TPluginInfo = {
  id: string;
  enabled: boolean;
  loadError?: string;
  author: TPluginPackageJson["sharkord"]["author"];
  description: TPluginPackageJson["sharkord"]["description"];
  version: TPluginPackageJson["version"];
  logo: TPluginPackageJson["sharkord"]["logo"];
  name: TPluginPackageJson["name"];
  homepage: TPluginPackageJson["sharkord"]["homepage"];
  path: string;
  entry: string;
};

export type TLogEntry = {
  type: "info" | "error" | "debug";
  timestamp: number;
  message: string;
  pluginId: string;
};

export type TCommandArg = {
  name: string;
  description?: string;
  type: "string" | "number" | "boolean";
  required?: boolean;
};

export interface CommandDefinition<TArgs = void> {
  name: string;
  description?: string;
  args?: TCommandArg[];
  executes(args: TArgs): Promise<unknown>;
}

export type TPluginCommand = {
  pluginId: string;
  name: string;
  description?: string;
};

export type TCommandInfo = {
  pluginId: string;
  name: string;
  description?: string;
  args?: CommandDefinition<unknown>["args"];
};

export type TCommandsMapByPlugin = {
  [pluginId: string]: TCommandInfo[];
};
