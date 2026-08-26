const onLoad = (ctx) => {
  ctx.logger.log('plugin-incompatible-sdk-version loaded');
};

const onUnload = (ctx) => {
  ctx.logger.log('plugin-incompatible-sdk-version unloaded');
};

export { onLoad, onUnload };
