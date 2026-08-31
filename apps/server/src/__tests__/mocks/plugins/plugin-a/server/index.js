import fs from 'fs/promises';
import path from 'path';

const onLoad = async (ctx) => {
  ctx.logger.log('My Plugin loaded');

  ctx.events.on('user:joined', ({ userId, username }) => {
    ctx.logger.log(`User joined: ${username} (ID: ${userId})`);
  });

  // written on every load, so a test can prove the directory outlives an update
  const marker = path.join(ctx.dataPath, 'marker.txt');

  if (!(await fs.exists(marker))) {
    await fs.writeFile(marker, 'written on first load');
  }
};

const onUnload = (ctx) => {
  ctx.logger.log('My Plugin unloaded');
};

export { onLoad, onUnload };
