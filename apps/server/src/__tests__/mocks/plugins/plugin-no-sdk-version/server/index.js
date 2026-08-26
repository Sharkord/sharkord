const onLoad = (ctx) => {
  ctx.logger.log('plugin-no-sdk-version loaded');
};

const onUnload = (ctx) => {
  ctx.logger.log('plugin-no-sdk-version unloaded');
};

export { onLoad, onUnload };
