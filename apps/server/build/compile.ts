type TOptions = {
  outPath: string;
  target: Bun.Build.Target;
};

const compile = async ({ outPath, target }: TOptions) => {
  await Bun.build({
    entrypoints: [
      './src/index.ts',
      './build/temp/drizzle.zip',
      './build/temp/interface.zip'
    ],
    compile: {
      outfile: outPath,
      target
    },
    define: {
      SHARKORD_ENV: '"production"',
      SHARKORD_BUILD_VERSION: '"1.1.1"',
      SHARKORD_BUILD_DATE: `"${new Date().toISOString()}"`
    }
  });
};

export { compile };
