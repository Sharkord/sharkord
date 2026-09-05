const onLoad = (ctx) => {
  ctx.logger.log('Plugin message actions loaded');

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
      },
      {
        name: 'parentMessageId',
        type: 'number',
        required: false
      },
      {
        name: 'replyToMessageId',
        type: 'number',
        required: false
      }
    ],
    async executes(invokerCtx, args) {
      return ctx.messages.send(args.channelId, args.content, {
        parentMessageId: args.parentMessageId,
        replyToMessageId: args.replyToMessageId
      });
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
    async executes(invokerCtx, args) {
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
    async executes(invokerCtx, args) {
      await ctx.messages.delete(args.messageId);
      return { success: true };
    }
  });
  ctx.commands.register({
    name: 'list-messages',
    description: 'List messages in a channel',
    args: [
      { name: 'channelId', type: 'number', required: true },
      { name: 'limit', type: 'number', required: false },
      { name: 'before', type: 'number', required: false }
    ],
    async executes(invokerCtx, args) {
      const messages = await ctx.messages.list({
        channelId: args.channelId,
        limit: args.limit,
        before: args.before
      });

      return {
        count: messages.length,
        contents: messages.map((message) => message.content),
        createdAt: messages.map((message) => message.createdAt)
      };
    }
  });

  ctx.commands.register({
    name: 'get-message',
    description: 'Read one message',
    args: [{ name: 'messageId', type: 'number', required: true }],
    async executes(invokerCtx, args) {
      const message = await ctx.messages.get(args.messageId);

      return { found: !!message, content: message?.content ?? null };
    }
  });
};

const onUnload = (ctx) => {
  ctx.logger.log('Plugin message actions unloaded');
};

export { onLoad, onUnload };
