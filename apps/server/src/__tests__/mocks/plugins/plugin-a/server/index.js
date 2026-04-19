const onLoad = (ctx) => {
  ctx.log('My Plugin loaded');

  ctx.events.on('user:joined', ({ userId, username }) => {
    ctx.log(`User joined: ${username} (ID: ${userId})`);
  });
};

const onUnload = (ctx) => {
  ctx.log('My Plugin unloaded');
};

export { onLoad, onUnload };
