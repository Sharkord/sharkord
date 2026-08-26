import path from 'path';

const isPathInside = (basePath: string, targetPath: string): boolean => {
  const base = path.resolve(basePath);
  const target = path.resolve(targetPath);

  return target === base || target.startsWith(base + path.sep);
};

export { isPathInside };
