const onLoad = (ctx) => {
  ctx.http.get('missing-slash', (req, res) => {
    res.writeHead(200);
    res.end();
  });
};

export { onLoad };
