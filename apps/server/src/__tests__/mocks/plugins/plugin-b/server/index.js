const onLoad = (ctx) => {
  // deliberately the deprecated flat form, so removing ctx.log fails a test
  // instead of silently breaking existing plugins
  ctx.log('Plugin B loaded');

  // chat_actions is declared, topbar_right is left out and so stays public
  ctx.ui.enable({ chat_actions: 'MANAGE_MESSAGES' });

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
    async executes(invokerCtx, args) {
      ctx.logger.log('Executing test-command with:', args);
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
    async executes(invokerCtx, args) {
      return { result: args.a + args.b };
    }
  });

  ctx.commands.register({
    name: 'can-manage-users',
    description: 'Whether a user may manage users',
    args: [{ name: 'userId', type: 'number', required: true }],
    async executes(invokerCtx, args) {
      return {
        allowed: await ctx.permissions.userCan(args.userId, 'MANAGE_USERS')
      };
    }
  });

  ctx.commands.register({
    name: 'grant-role',
    description: 'Assign a role to a user',
    args: [
      { name: 'userId', type: 'number', required: true },
      { name: 'roleId', type: 'number', required: true }
    ],
    async executes(invokerCtx, args) {
      await ctx.roles.assign(args.userId, args.roleId);

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'revoke-role',
    description: 'Remove a role from a user',
    args: [
      { name: 'userId', type: 'number', required: true },
      { name: 'roleId', type: 'number', required: true }
    ],
    async executes(invokerCtx, args) {
      await ctx.roles.remove(args.userId, args.roleId);

      return { ok: true };
    }
  });

  // declares its own default access, so an unconfigured capability is not public
  ctx.commands.register({
    name: 'admin-sum',
    description: 'Sum two numbers, for message managers',
    requires: 'MANAGE_MESSAGES',
    args: [
      { name: 'a', type: 'number', required: true },
      { name: 'b', type: 'number', required: true }
    ],
    async executes(invokerCtx, args) {
      return { result: args.a + args.b };
    }
  });

  ctx.actions.register({
    name: 'admin-multiply',
    description: 'Multiply two numbers, for user managers',
    requires: 'MANAGE_USERS',
    async executes(invokerCtx, payload) {
      return { result: payload.a * payload.b };
    }
  });

  // same name as this plugin's own 'sum' command, one type apart
  ctx.actions.register({
    name: 'sum',
    description: 'Sum two numbers as an action',
    async executes(invokerCtx, payload) {
      return { result: payload.a + payload.b };
    }
  });

  ctx.actions.register({
    name: 'multiply',
    description: 'Multiply two numbers',
    async executes(invokerCtx, payload) {
      return { result: payload.a * payload.b };
    }
  });

  ctx.commands.register({
    name: 'make-ticket',
    description: 'Create a private channel in a category',
    args: [
      { name: 'name', type: 'string', required: true },
      { name: 'categoryId', type: 'number', required: true }
    ],
    async executes(invokerCtx, args) {
      const channel = await ctx.channels.create({
        name: args.name,
        type: 'TEXT',
        categoryId: args.categoryId,
        private: true
      });

      return { channelId: channel.id, private: channel.private };
    }
  });

  ctx.commands.register({
    name: 'attach',
    description: 'Store bytes and post them as an attachment',
    args: [
      { name: 'channelId', type: 'number', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'body', type: 'string', required: true }
    ],
    async executes(invokerCtx, args) {
      const { messageId } = await ctx.messages.send(args.channelId, '', {
        files: [
          { name: args.name, data: new TextEncoder().encode(args.body) }
        ]
      });

      return { messageId };
    }
  });

  ctx.commands.register({
    name: 'send-too-many-files',
    description: 'Attach more files than the server allows',
    args: [{ name: 'channelId', type: 'number', required: true }],
    async executes(invokerCtx, args) {
      return ctx.messages.send(args.channelId, 'too many', {
        files: Array.from({ length: 50 }, (_, index) => ({
          name: `f-${index}.txt`,
          data: new TextEncoder().encode('x')
        }))
      });
    }
  });

  ctx.commands.register({
    name: 'push',
    description: 'Push something to plugin clients',
    args: [
      { name: 'target', type: 'string', required: true },
      { name: 'userId', type: 'number', required: false },
      { name: 'note', type: 'string', required: false }
    ],
    async executes(invokerCtx, args) {
      const data = { note: args.note ?? 'hi' };

      if (args.target === 'all') {
        ctx.push.toAll(data);
      } else if (args.target === 'users') {
        ctx.push.toUsers([args.userId], data);
      } else {
        ctx.push.toUser(args.userId, data);
      }

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'push-too-big',
    description: 'Push more than the cap allows',
    args: [{ name: 'userId', type: 'number', required: true }],
    async executes(invokerCtx, args) {
      ctx.push.toUser(args.userId, { blob: 'x'.repeat(70000) });

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'pin',
    description: 'Pin or unpin a message',
    args: [
      { name: 'messageId', type: 'number', required: true },
      { name: 'pinned', type: 'boolean', required: true }
    ],
    async executes(invokerCtx, args) {
      if (args.pinned) {
        await ctx.messages.pin(args.messageId);
      } else {
        await ctx.messages.unpin(args.messageId);
      }

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'react',
    description: 'React or unreact as the plugin',
    args: [
      { name: 'messageId', type: 'number', required: true },
      { name: 'emoji', type: 'string', required: true },
      { name: 'remove', type: 'boolean', required: false }
    ],
    async executes(invokerCtx, args) {
      if (args.remove) {
        await ctx.messages.unreact(args.messageId, args.emoji);
      } else {
        await ctx.messages.react(args.messageId, args.emoji);
      }

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'remember',
    description: 'Store and read back per-user data',
    args: [
      { name: 'userId', type: 'number', required: true },
      { name: 'value', type: 'string', required: false }
    ],
    async executes(invokerCtx, args) {
      if (args.value !== undefined) {
        await ctx.userData.set(args.userId, { note: args.value });
      }

      return { data: await ctx.userData.get(args.userId) };
    }
  });

  ctx.commands.register({
    name: 'forget',
    description: 'Drop per-user data',
    args: [{ name: 'userId', type: 'number', required: true }],
    async executes(invokerCtx, args) {
      await ctx.userData.delete(args.userId);

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'moderate',
    description: 'Ban, unban or kick a user',
    args: [
      { name: 'action', type: 'string', required: true },
      { name: 'userId', type: 'number', required: true }
    ],
    async executes(invokerCtx, args) {
      if (args.action === 'ban') {
        await ctx.users.ban(args.userId, 'spam');
      } else if (args.action === 'unban') {
        await ctx.users.unban(args.userId);
      } else {
        await ctx.users.kick(args.userId, 'spam');
      }

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'lookup',
    description: 'Read one of each kind of thing by id',
    args: [
      { name: 'userId', type: 'number', required: true },
      { name: 'channelId', type: 'number', required: true },
      { name: 'categoryId', type: 'number', required: true },
      { name: 'roleId', type: 'number', required: true }
    ],
    async executes(invokerCtx, args) {
      const [user, channel, category, role] = await Promise.all([
        ctx.users.get(args.userId),
        ctx.channels.get(args.channelId),
        ctx.categories.get(args.categoryId),
        ctx.roles.get(args.roleId)
      ]);

      return {
        user: user?.name,
        channel: channel?.name,
        category: category?.name,
        role: role?.name,
        userCount: (await ctx.users.list()).length
      };
    }
  });

  ctx.commands.register({
    name: 'list-channels',
    description: 'List channels a plugin can act on',
    async executes() {
      const list = await ctx.channels.list();

      return { names: list.map((channel) => channel.name) };
    }
  });

  ctx.commands.register({
    name: 'rename-channel',
    description: 'Rename a channel',
    args: [
      { name: 'channelId', type: 'number', required: true },
      { name: 'name', type: 'string', required: true }
    ],
    async executes(invokerCtx, args) {
      await ctx.channels.update(args.channelId, { name: args.name });

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'drop-channel',
    description: 'Delete a channel',
    args: [{ name: 'channelId', type: 'number', required: true }],
    async executes(invokerCtx, args) {
      await ctx.channels.delete(args.channelId);

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'make-category',
    description: 'Create a category',
    args: [{ name: 'name', type: 'string', required: true }],
    async executes(invokerCtx, args) {
      const category = await ctx.categories.create(args.name);

      return { categoryId: category.id, count: (await ctx.categories.list()).length };
    }
  });

  ctx.commands.register({
    name: 'drop-category',
    description: 'Delete a category',
    args: [{ name: 'categoryId', type: 'number', required: true }],
    async executes(invokerCtx, args) {
      await ctx.categories.delete(args.categoryId);

      return { ok: true };
    }
  });

  ctx.http.get('/hello', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pluginId: ctx.pluginId, method: req.method }));
  });

  // declares a caller, so the host resolves one before the handler runs
  ctx.http.get(
    '/me',
    (req, res, routeCtx) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ userId: routeCtx.userId }));
    },
    { auth: true }
  );

  ctx.http.get(
    '/admin-only',
    (req, res, routeCtx) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ userId: routeCtx.userId }));
    },
    { requires: 'MANAGE_MESSAGES' }
  );

  ctx.http.post('/echo', async (req, res) => {
    let body = '';

    for await (const chunk of req) {
      body += chunk;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ body }));
  });

  ctx.http.patch('/resource', (req, res) => {
    res.writeHead(202, { 'Content-Type': 'text/plain' });
    res.end('patched');
  });

  ctx.http.delete('/resource', (req, res) => {
    res.writeHead(204);
    res.end();
  });

  ctx.http.options('/cors', (req, res) => {
    res.writeHead(200, {
      Allow: 'POST, OPTIONS',
      'Content-Type': 'text/plain'
    });
    res.end('plugin options');
  });

  ctx.http.post('/sdp/*', async (req, res) => {
    let body = '';

    for await (const chunk of req) {
      body += chunk;
    }

    const contentType = req.headers['content-type'];
    const authorization = req.headers.authorization;

    res.writeHead(201, {
      'Content-Type': contentType || 'text/plain',
      Location: req.url || '',
      ETag: '"plugin-sdp"'
    });

    res.end(
      [
        `method=${req.method}`,
        `authorization=${authorization}`,
        `content-type=${contentType}`,
        `url=${req.url}`,
        body
      ].join('\n')
    );
  });
};

const onUnload = (ctx) => {
  ctx.logger.log('Plugin B unloaded');
};

export { onLoad, onUnload };
