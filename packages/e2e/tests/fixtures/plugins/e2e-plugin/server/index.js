const onLoad = (ctx) => {
  // chat_actions is left undeclared so it is public, which is what the
  // permissions test then restricts through the admin UI
  ctx.ui.enable();

  // declares a permission the moderator role does not hold, so the client can be
  // checked against a capability it may not use
  ctx.actions.register({
    name: 'e2e-restricted',
    requires: 'MANAGE_MESSAGES',
    async executes() {
      return { ok: true };
    }
  });

  ctx.actions.register({
    name: 'e2e-open',
    async executes() {
      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'e2e-ping',
    description: 'Answers so a command can be asserted end to end',
    async executes() {
      return { message: 'pong' };
    }
  });
};

export { onLoad };
