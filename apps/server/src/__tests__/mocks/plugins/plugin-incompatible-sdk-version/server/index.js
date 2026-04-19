const onLoad = (ctx) => {
  ctx.log('plugin-incompatible-sdk-version loaded');
};

const onUnload = (ctx) => {
  ctx.log('plugin-incompatible-sdk-version unloaded');
};

export { onLoad, onUnload };
