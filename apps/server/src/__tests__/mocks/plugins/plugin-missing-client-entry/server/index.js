const onLoad = (ctx) => {
  ctx.logger.log('plugin-missing-client-entry loaded');
};

const onUnload = (ctx) => {
  ctx.logger.log('plugin-missing-client-entry unloaded');
};

export { onLoad, onUnload };