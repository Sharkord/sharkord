const onLoad = (ctx) => {
  ctx.log('Attempting to load...');
  throw new Error('Intentional error during load');
};

const onUnload = (ctx) => {
  ctx.log('Plugin unloaded');
};

export { onLoad, onUnload };
