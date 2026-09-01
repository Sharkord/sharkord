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
    async execute(invokerCtx, args) {
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
    async execute(invokerCtx, args) {
      return { result: args.a + args.b };
    }
  });

  ctx.commands.register({
    name: 'can-manage-users',
    description: 'Whether a user may manage users',
    args: [{ name: 'userId', type: 'number', required: true }],
    async execute(invokerCtx, args) {
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
    async execute(invokerCtx, args) {
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
    async execute(invokerCtx, args) {
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
    async execute(invokerCtx, args) {
      return { result: args.a + args.b };
    }
  });

  ctx.actions.register({
    name: 'admin-multiply',
    description: 'Multiply two numbers, for user managers',
    requires: 'MANAGE_USERS',
    async execute(invokerCtx, payload) {
      return { result: payload.a * payload.b };
    }
  });

  ctx.actions.register({
    name: 'multiply',
    description: 'Multiply two numbers',
    async execute(invokerCtx, payload) {
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
    async execute(invokerCtx, args) {
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
    name: 'list-channels',
    description: 'List channels a plugin can act on',
    async execute() {
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
    async execute(invokerCtx, args) {
      await ctx.channels.update(args.channelId, { name: args.name });

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'drop-channel',
    description: 'Delete a channel',
    args: [{ name: 'channelId', type: 'number', required: true }],
    async execute(invokerCtx, args) {
      await ctx.channels.delete(args.channelId);

      return { ok: true };
    }
  });

  ctx.commands.register({
    name: 'make-category',
    description: 'Create a category',
    args: [{ name: 'name', type: 'string', required: true }],
    async execute(invokerCtx, args) {
      const category = await ctx.categories.create(args.name);

      return { categoryId: category.id, count: (await ctx.categories.list()).length };
    }
  });

  ctx.commands.register({
    name: 'drop-category',
    description: 'Delete a category',
    args: [{ name: 'categoryId', type: 'number', required: true }],
    async execute(invokerCtx, args) {
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
