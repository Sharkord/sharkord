declare const SHARKORD_BUILD_VERSION: string | undefined;
declare const SHARKORD_ENV: string | undefined;
declare const SHARKORD_BUILD_DATE: string | undefined;

const SERVER_VERSION =
  typeof SHARKORD_BUILD_VERSION !== 'undefined'
    ? SHARKORD_BUILD_VERSION
    : 'dev';

const BUILD_DATE =
  typeof SHARKORD_BUILD_DATE !== 'undefined' ? SHARKORD_BUILD_DATE : 'dev';

const env = typeof SHARKORD_ENV !== 'undefined' ? SHARKORD_ENV : 'development';
const IS_PRODUCTION = env === 'production';
const IS_DEVELOPMENT = !IS_PRODUCTION;

export { BUILD_DATE, IS_DEVELOPMENT, IS_PRODUCTION, SERVER_VERSION };
