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
};

export { onLoad };
