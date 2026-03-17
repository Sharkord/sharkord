import fs from 'fs/promises';
import path from 'path';

const onLoad = (ctx) => {
  ctx.hooks.onBeforeFileSave(async ({ tempFile }) => {
    const originalContent = await fs.readFile(tempFile.path, 'utf-8');
    const updatedContent = `${originalContent}\nmodified by plugin`;
    const newPath = path.join(
      path.dirname(tempFile.path),
      `hook-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`
    );

    await fs.writeFile(newPath, updatedContent);

    return newPath;
  });

  ctx.log('Plugin before-file-save loaded');
};

const onUnload = (ctx) => {
  ctx.log('Plugin before-file-save unloaded');
};

export { onLoad, onUnload };
