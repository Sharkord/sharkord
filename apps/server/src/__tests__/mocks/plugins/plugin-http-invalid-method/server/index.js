const onLoad = (ctx) => {
  ctx.http.register('PUT', '/invalid', (req, res) => {
    res.writeHead(200);
    res.end();
  });
};

export { onLoad };
