const onLoad = (ctx) => {
  ctx.http.get('/leaked', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('leaked');
  });

  throw new Error('Intentional HTTP route load failure');
};

const onUnload = () => {};

export { onLoad, onUnload };
