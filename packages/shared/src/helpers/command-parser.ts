import {
  zParsedDomCommand,
  type RegisteredCommand,
  type TCommandElement,
  type TParsedDomCommand,
} from "../plugins";

const toDomCommand = (
  command: RegisteredCommand & {
    imageUrl?: string;
    status: "pending" | "completed" | "failed";
    response?: unknown;
  },
  args: unknown[]
): string => {
  const sanitizedArgs =
    command.args?.map((argDef, index) => {
      const argValue = args[index];

      if (argDef.sensitive) {
        return { name: argDef.name, value: "****", status: command.status };
      }

      return { name: argDef.name, value: argValue, status: command.status };
    }) || [];

  const responseString =
    command.response !== undefined
      ? typeof command.response === "string"
        ? command.response
        : JSON.stringify(command.response, null, 2)
      : "";

  const logoAttr = command.imageUrl
    ? ` data-plugin-logo="${command.imageUrl}"`
    : '';

  return `<command data-plugin-id="${command.pluginId}"${logoAttr} data-command="${command.name}" data-args='${JSON.stringify(
    sanitizedArgs
  )}' data-status='${command.status}' data-response='${responseString}'></command>`;
};

const parseDomCommand = (domElement: TCommandElement): TParsedDomCommand => {
  const pluginId = domElement.attribs["data-plugin-id"];
  const commandName = domElement.attribs["data-command"];
  const argsString = domElement.attribs["data-args"];
  const status = domElement.attribs["data-status"];
  const response = domElement.attribs["data-response"];
  const logo = domElement.attribs["data-plugin-logo"];

  let args: unknown;

  try {
    args = JSON.parse(argsString || "[]");
  } catch {
    throw new Error("Invalid command arguments JSON");
  }

  return zParsedDomCommand.parse({
    pluginId,
    commandName,
    args,
    status,
    response,
    logo,
  });
};

export { parseDomCommand, toDomCommand };
