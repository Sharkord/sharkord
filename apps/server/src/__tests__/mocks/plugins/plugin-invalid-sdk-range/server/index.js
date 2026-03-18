const onLoad = (ctx) => {
  ctx.log('plugin-invalid-sdk-range loaded');
};

const onUnload = (ctx) => {
  ctx.log('plugin-invalid-sdk-range unloaded');
};

export { onLoad, onUnload };
