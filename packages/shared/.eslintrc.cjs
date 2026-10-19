module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  plugins: ['@typescript-eslint', 'unused-imports'],
  parserOptions: {
    ecmaVersion: 'latest',
    // pinned so the editor does not have to guess it among the flat configs of the client and the desktop app
    tsconfigRootDir: __dirname
  },
  ignorePatterns: ['data/**', 'data-test/**', 'node_modules/**', 'build/**'],
  rules: {
    allowEmptyCatch: 0,
    'unused-imports/no-unused-imports': 'warn',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
