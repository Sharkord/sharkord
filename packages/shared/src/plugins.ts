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
  sensitive?: boolean;
};

export type TInvokerContext = {
  userId: number;
  currentVoiceChannelId?: number;
};

export interface CommandDefinition<TArgs = void> {
  name: string;
  description?: string;
  args?: TCommandArg[];
  executes(ctx: TInvokerContext, args: TArgs): Promise<unknown>;
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

export type RegisteredCommand = {
  pluginId: string;
  name: string;
  description?: string;
  args?: CommandDefinition<unknown>["args"];
  command: CommandDefinition<unknown>;
};

export const zParsedDomCommand = z.object({
  pluginId: z.string().min(1),
  commandName: z.string().min(1),
  status: z.enum(["pending", "completed", "failed"]).default("pending"),
  response: z.string().optional(),
  logo: z.url().optional(),
  args: z.array(
    z.object({
      name: z.string(),
      value: z.unknown(),
    }),
  ),
});

export type TParsedDomCommand = z.infer<typeof zParsedDomCommand>;

export type TCommandElement = {
  attribs: {
    "data-plugin-id"?: string;
    "data-plugin-logo"?: string;
    "data-command"?: string;
    "data-status"?: string;
    "data-args"?: string;
    "data-response"?: string;
  };
};

export type TPluginSettingType = "string" | "number" | "boolean";

export type TPluginSettingDefinition = {
  key: string;
  name: string;
  description?: string;
  type: TPluginSettingType;
  defaultValue: string | number | boolean;
};

export type TPluginSettingsResponse = {
  definitions: TPluginSettingDefinition[];
  values: Record<string, unknown>;
};
