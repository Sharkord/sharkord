import type { TCommandArg } from '@sharkord/shared';
import z from 'zod';
import { invariant } from '../utils/invariant';

const buildArgSchema = (arg: TCommandArg) => {
  if (arg.type === 'number') return z.coerce.number();

  if (arg.type === 'boolean') {
    return z.union([
      z.boolean(),
      z.enum(['true', 'false']).transform((value) => value === 'true')
    ]);
  }

  return z.string();
};

const buildCommandArgsSchema = (args: TCommandArg[]) =>
  z.object(
    Object.fromEntries(
      args.map((arg) => [
        arg.name,
        arg.required ? buildArgSchema(arg) : buildArgSchema(arg).optional()
      ])
    )
  );

const parsePluginCommandArgs = (
  commandName: string,
  args: TCommandArg[] | undefined,
  raw: Record<string, unknown>
): Record<string, unknown> => {
  if (!args?.length) return raw;

  const result = buildCommandArgsSchema(args).safeParse(raw);

  invariant(result.success, {
    code: 'BAD_REQUEST',
    message: `/${commandName}: ${result.error?.issues
      .map(
        (issue) =>
          `${issue.path.join('.') || 'argument'} ${issue.message.toLowerCase()}`
      )
      .join(', ')}`
  });

  return result.data;
};

export { parsePluginCommandArgs };
