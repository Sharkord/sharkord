const onLoad = (ctx) => {
  ctx.http.get('/foo/*/bar', (req, res) => {
    res.writeHead(200);
    res.end();
  });
};

export { onLoad };
