import { toast } from 'sonner';

export type TBuiltInCommand = {
  name: string;
  description: string;
  handler: () => void;
};

export const BUILT_IN_COMMANDS: TBuiltInCommand[] = [
  {
    name: 'ping',
    description: 'Replies with Pong!',
    handler: () => {
      toast.success('Pong!');
    }
  }
];

/**
 * Try to handle a message as a built-in slash command.
 * Returns true if the message was handled as a command, false otherwise.
 */
export const handleBuiltInCommand = (html: string): boolean => {
  const text = html.replace(/<[^>]*>/g, '').trim();

  if (!text.startsWith('/')) return false;

  const commandName = text.slice(1).split(/\s/)[0].toLowerCase();
  const command = BUILT_IN_COMMANDS.find((c) => c.name === commandName);

  if (!command) return false;

  command.handler();
  return true;
};
