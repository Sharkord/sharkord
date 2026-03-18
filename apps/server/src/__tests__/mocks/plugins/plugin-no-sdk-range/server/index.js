const onLoad = (ctx) => {
  ctx.log('plugin-no-sdk-range loaded');
};

const onUnload = (ctx) => {
  ctx.log('plugin-no-sdk-range unloaded');
};

export { onLoad, onUnload };
