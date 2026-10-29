module.exports = {
  extends: ['../../eslint-base.cjs'],
  parserOptions: {
    // pinned so the editor does not have to guess it among the flat configs of the client and the desktop app
    tsconfigRootDir: __dirname
  }
};
