import {
  zParsedDomCommand,
  type RegisteredCommand,
  type TCommandElement,
  type TParsedDomCommand
} from '../plugins';

// command arguments come from the message the user typed and responses come from
// the plugin, and the element built here is stored as message content without
// going through sanitizeMessageHtml (which does not allow <command> at all), so
// every value has to be escaped here or it escapes its attribute
const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toAttribute = (name: string, value: string | undefined) =>
  value === undefined ? '' : ` ${name}="${escapeAttribute(value)}"`;

const toDomCommand = (
  command: RegisteredCommand & {
    imageUrl?: string;
    status: 'pending' | 'completed' | 'failed';
    response?: unknown;
  },
  args: unknown[]
): string => {
  const sanitizedArgs =
    command.args?.map((argDef, index) => {
      const argValue = args[index];

      if (argDef.sensitive) {
        return { name: argDef.name, value: '****', status: command.status };
      }

      return { name: argDef.name, value: argValue, status: command.status };
    }) || [];

  const responseString =
    command.response !== undefined
      ? typeof command.response === 'string'
        ? command.response
        : JSON.stringify(command.response, null, 2)
      : '';

  const attributes = [
    toAttribute('data-plugin-id', command.pluginId),
    toAttribute('data-plugin-logo', command.imageUrl),
    toAttribute('data-command', command.name),
    toAttribute('data-args', JSON.stringify(sanitizedArgs)),
    toAttribute('data-status', command.status),
    toAttribute('data-response', responseString)
  ].join('');

  return `<command${attributes}></command>`;
};

const parseDomCommand = (domElement: TCommandElement): TParsedDomCommand => {
  const pluginId = domElement.attribs['data-plugin-id'];
  const commandName = domElement.attribs['data-command'];
  const argsString = domElement.attribs['data-args'];
  const status = domElement.attribs['data-status'];
  const response = domElement.attribs['data-response'];
  const logo = domElement.attribs['data-plugin-logo'];

  let args: unknown;

  try {
    args = JSON.parse(argsString || '[]');
  } catch {
    throw new Error('Invalid command arguments JSON');
  }

  return zParsedDomCommand.parse({
    pluginId,
    commandName,
    args,
    status,
    response,
    logo
  });
};

export { parseDomCommand, toDomCommand };
