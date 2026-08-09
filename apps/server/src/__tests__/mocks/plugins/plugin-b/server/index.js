const onLoad = (ctx) => {
  // deliberately the deprecated flat form, so removing ctx.log fails a test
  // instead of silently breaking existing plugins
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

  ctx.actions.register({
    name: 'multiply',
    description: 'Multiply two numbers',
    async execute(invokerCtx, payload) {
      return { result: payload.a * payload.b };
    }
  });

  ctx.http.get('/hello', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pluginId: ctx.pluginId, method: req.method }));
  });

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
