const text = (res, body) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(body);
};

const onLoad = (ctx) => {
  ctx.http.get('/', (req, res) => text(res, 'root'));

  ctx.http.get('/duplicate', (req, res) => text(res, 'first'));
  ctx.http.get('/duplicate', (req, res) => text(res, 'second'));

  ctx.http.get('/wild/*', (req, res) => text(res, 'wildcard'));
  ctx.http.get('/wild/exact', (req, res) => text(res, 'exact'));

  ctx.http.get('/api/*', (req, res) => text(res, 'api'));
  ctx.http.get('/api/v1/*', (req, res) => text(res, 'api-v1'));

  ctx.http.get('/throws', () => {
    throw new Error('Plugin route failed');
  });

  ctx.http.get('/throws-after-headers', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('partial');

    throw new Error('Plugin route failed mid-response');
  });

  ctx.http.get('/trailing', (req, res) => text(res, 'trailing'));

  ctx.http.get('/encoded path', (req, res) => text(res, 'encoded'));

  ctx.http.post('/post-only', (req, res) => text(res, 'post-only'));

  ctx.http.delete('/*', (req, res) => text(res, 'catch-all'));
};

export { onLoad };
