const onLoad = (ctx) => {
  ctx.log('plugin-no-sdk-version loaded');
};

const onUnload = (ctx) => {
  ctx.log('plugin-no-sdk-version unloaded');
};

export { onLoad, onUnload };
