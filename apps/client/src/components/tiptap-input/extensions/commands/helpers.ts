import { MessageNodeType, type TCommandArg } from '@sharkord/shared';

type TPluginCommandValues = Record<string, string>;

const safeJsonParse = <T>(raw: unknown, fallback: T): T => {
  if (typeof raw !== 'string' || !raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const serializeArgToken = (value: string): string => {
  if (value.length === 0) {
    return '""';
  }

  if (/^[^\s"'\\]+$/.test(value)) {
    return value;
  }

  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `"${escaped}"`;
};

const serializeArgValue = (arg: TCommandArg, raw: string): string => {
  if (raw === '') return '""';

  if (arg.type === 'number') return raw;

  if (arg.type === 'boolean') return raw === 'true' ? 'true' : 'false';

  return serializeArgToken(raw);
};

const serializePluginCommandText = (
  commandName: string,
  argDefs: TCommandArg[],
  values: TPluginCommandValues
): string => {
  const tokens = argDefs.map((arg) =>
    serializeArgValue(arg, values[arg.name] ?? '')
  );

  while (tokens.at(-1) === '""') tokens.pop();

  return [`/${commandName}`, ...tokens].join(' ');
};

type TMissingCommandArg = {
  commandName: string;
  argName: string;
};

const findMissingRequiredCommandArg = (
  html: string
): TMissingCommandArg | undefined => {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const nodes = document.querySelectorAll(
    `span[data-type="${MessageNodeType.PLUGIN_COMMAND}"]`
  );

  for (const node of nodes) {
    const argDefs = safeJsonParse<TCommandArg[]>(
      node.getAttribute('data-command-args'),
      []
    );
    const values = safeJsonParse<TPluginCommandValues>(
      node.getAttribute('data-command-values'),
      {}
    );
    const missing = argDefs.find(
      (arg) => arg.required && !(values[arg.name] ?? '')
    );

    if (missing) {
      return {
        commandName: node.getAttribute('data-command-name') ?? '',
        argName: missing.name
      };
    }
  }

  return undefined;
};

export {
  findMissingRequiredCommandArg,
  safeJsonParse,
  serializePluginCommandText
};
export type { TMissingCommandArg, TPluginCommandValues };
