const onLoad = (ctx) => {
  ctx.logger.log('My Plugin loaded');

  ctx.events.on('user:joined', ({ userId, username }) => {
    ctx.logger.log(`User joined: ${username} (ID: ${userId})`);
  });
};

const onUnload = (ctx) => {
  ctx.logger.log('My Plugin unloaded');
};

export { onLoad, onUnload };
