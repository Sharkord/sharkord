const onLoad = (ctx) => {
  ctx.log('plugin-invalid-sdk-version loaded');
};

const onUnload = (ctx) => {
  ctx.log('plugin-invalid-sdk-version unloaded');
};

export { onLoad, onUnload };
