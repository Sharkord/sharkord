import fs from 'fs/promises';
import path from 'path';

const onLoad = async (ctx) => {
  ctx.logger.log('My Plugin loaded');

  ctx.events.on('user:joined', ({ userId, username }) => {
    ctx.logger.log(`User joined: ${username} (ID: ${userId})`);
  });

  // deliberately the same name as one of plugin-b's commands: the access rules
  // are keyed by plugin, and nothing proved that until this collided
  ctx.commands.register({
    name: 'sum',
    description: 'Sum two numbers, from the other plugin',
    args: [
      { name: 'a', type: 'number', required: true },
      { name: 'b', type: 'number', required: true }
    ],
    async execute(invokerCtx, args) {
      return { result: args.a + args.b, from: 'plugin-a' };
    }
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
