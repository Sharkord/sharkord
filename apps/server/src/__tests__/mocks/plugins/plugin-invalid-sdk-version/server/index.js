const onLoad = (ctx) => {
  ctx.logger.log('plugin-invalid-sdk-version loaded');
};

const onUnload = (ctx) => {
  ctx.logger.log('plugin-invalid-sdk-version unloaded');
};

export { onLoad, onUnload };
