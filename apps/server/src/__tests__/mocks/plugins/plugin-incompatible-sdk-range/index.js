const onLoad = (ctx) => {
  ctx.log('plugin-incompatible-sdk-range loaded');
};

const onUnload = (ctx) => {
  ctx.log('plugin-incompatible-sdk-range unloaded');
};

export { onLoad, onUnload };
