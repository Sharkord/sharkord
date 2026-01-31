import { parseArgsStringToArgv } from 'string-argv';

const parseCommandArgs = (plainText: string) => {
  const tokens = parseArgsStringToArgv(plainText);

  if (tokens.length === 0) {
    return { commandName: undefined, args: [] };
  }

  const commandName = tokens[0]?.startsWith('/')
    ? tokens[0].slice(1)
    : tokens[0];

  return {
    commandName,
    args: tokens.slice(1)
  };
};

export { parseCommandArgs };
