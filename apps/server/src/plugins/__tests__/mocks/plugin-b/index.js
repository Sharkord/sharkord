const onLoad = (ctx) => {
  ctx.log('Plugin B loaded');

  // Register a command
  ctx.commands.register({
    name: 'test-command',
    description: 'A test command',
    args: [
      {
        name: 'message',
        type: 'string',
        description: 'Message to return',
        required: true
      }
    ],
    async executes(args) {
      ctx.log('Executing test-command with:', args);
      return { success: true, message: args.message };
    }
  });

  // Register another command
  ctx.commands.register({
    name: 'sum',
    description: 'Sum two numbers',
    args: [
      {
        name: 'a',
        type: 'number',
        required: true
      },
      {
        name: 'b',
        type: 'number',
        required: true
      }
    ],
    async executes(args) {
      return { result: args.a + args.b };
    }
  });
};

const onUnload = (ctx) => {
  ctx.log('Plugin B unloaded');
};

export { onLoad, onUnload };
