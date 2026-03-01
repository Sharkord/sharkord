import z from 'zod';

// legacy types for rendering old command messages stored in the DB

const zParsedDomCommand = z.object({
  pluginId: z.string().min(1),
  commandName: z.string().min(1),
  status: z.enum(['pending', 'completed', 'failed']).default('pending'),
  response: z.string().optional(),
  logo: z.url().optional(),
  args: z.array(
    z.object({
      name: z.string(),
      value: z.unknown()
    })
  )
});

export type TParsedDomCommand = z.infer<typeof zParsedDomCommand>;

type TCommandElement = {
  attribs: {
    'data-plugin-id'?: string;
    'data-plugin-logo'?: string;
    'data-command'?: string;
    'data-status'?: string;
    'data-args'?: string;
    'data-response'?: string;
  };
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

export { parseDomCommand };
