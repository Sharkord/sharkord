const onLoad = (ctx) => {
  ctx.log('Plugin B loaded');

  ctx.ui.enable();

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
    async execute(invokerCtx, args) {
      ctx.log('Executing test-command with:', args);
      return { success: true, message: args.message };
    }
  });

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
    async execute(invokerCtx, args) {
      return { result: args.a + args.b };
    }
  });

  ctx.actions.register({
    name: 'multiply',
    description: 'Multiply two numbers',
    async execute(invokerCtx, payload) {
      return { result: payload.a * payload.b };
    }
  });
};

const onUnload = (ctx) => {
  ctx.log('Plugin B unloaded');
};

export { onLoad, onUnload };
