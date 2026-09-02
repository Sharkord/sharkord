const onLoad = (ctx) => {
  // chat_actions is left undeclared so it is public, which is what the
  // permissions test then restricts through the admin UI
  ctx.ui.enable();

  ctx.commands.register({
    name: 'e2e-ping',
    description: 'Answers so a command can be asserted end to end',
    async execute() {
      return { message: 'pong' };
    }
  });
};

export { onLoad };
