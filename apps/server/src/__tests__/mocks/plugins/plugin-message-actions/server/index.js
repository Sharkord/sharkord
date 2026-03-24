const onLoad = (ctx) => {
  ctx.log('Plugin message actions loaded');

  ctx.commands.register({
    name: 'send-message',
    description: 'Send a message',
    args: [
      {
        name: 'channelId',
        type: 'number',
        required: true
      },
      {
        name: 'content',
        type: 'string',
        required: true
      }
    ],
    async execute(invokerCtx, args) {
      return ctx.messages.send(args.channelId, args.content);
    }
  });

  ctx.commands.register({
    name: 'edit-message',
    description: 'Edit a message',
    args: [
      {
        name: 'messageId',
        type: 'number',
        required: true
      },
      {
        name: 'content',
        type: 'string',
        required: true
      }
    ],
    async execute(invokerCtx, args) {
      await ctx.messages.edit(args.messageId, args.content);
      return { success: true };
    }
  });

  ctx.commands.register({
    name: 'delete-message',
    description: 'Delete a message',
    args: [
      {
        name: 'messageId',
        type: 'number',
        required: true
      }
    ],
    async execute(invokerCtx, args) {
      await ctx.messages.delete(args.messageId);
      return { success: true };
    }
  });
};

const onUnload = (ctx) => {
  ctx.log('Plugin message actions unloaded');
};

export { onLoad, onUnload };
