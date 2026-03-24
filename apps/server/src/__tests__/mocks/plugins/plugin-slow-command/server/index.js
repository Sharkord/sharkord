const onLoad = (ctx) => {
  ctx.log('Plugin slow command loaded');

  ctx.commands.register({
    name: 'hang',
    description: 'A command that hangs forever',
    async execute() {
      return new Promise(() => {});
    }
  });

  ctx.actions.register({
    name: 'hang',
    description: 'An action that hangs forever',
    async execute() {
      return new Promise(() => {});
    }
  });
};

export { onLoad };
