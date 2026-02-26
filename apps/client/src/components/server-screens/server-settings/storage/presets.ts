const MEGABYTE = 1024 * 1024;
const FILE_SIZE_STEP = 5 * 1024 * 1024; // 5MB

const QUOTA_PRESETS = [
  { label: '25 GB', value: 25 * 1024 * 1024 * 1024 },
  { label: '100 GB', value: 100 * 1024 * 1024 * 1024 },
  { label: '250 GB', value: 250 * 1024 * 1024 * 1024 }
];

const MAX_FILE_SIZE_PRESETS = [
  { label: '25 MB', value: 25 * MEGABYTE },
  { label: '100 MB', value: 100 * MEGABYTE },
  { label: '500 MB', value: 500 * MEGABYTE },
  { label: '1 GB', value: 1024 * MEGABYTE }
];

const MAX_AVATAR_SIZE_PRESETS = [
  { label: '1 MB', value: 1 * MEGABYTE },
  { label: '3 MB', value: 3 * MEGABYTE },
  { label: '10 MB', value: 10 * MEGABYTE }
];

const MAX_BANNER_SIZE_PRESETS = [
  { label: '1 MB', value: 1 * MEGABYTE },
  { label: '3 MB', value: 3 * MEGABYTE },
  { label: '10 MB', value: 10 * MEGABYTE }
];

const QUOTA_BY_USER_PRESETS = [
  { label: 'Unlimited', value: 0 },
  { label: '1 GB', value: 5 * 1024 * 1024 * 1024 },
  { label: '5 GB', value: 20 * 1024 * 1024 * 1024 },
  { label: '20 GB', value: 100 * 1024 * 1024 * 1024 }
];

const MAX_FILES_PER_MESSAGE_PRESETS = [
  { label: '0', value: 0 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '20', value: 20 }
];

export {
  FILE_SIZE_STEP,
  MAX_AVATAR_SIZE_PRESETS,
  MAX_BANNER_SIZE_PRESETS,
  MAX_FILES_PER_MESSAGE_PRESETS,
  MAX_FILE_SIZE_PRESETS,
  MEGABYTE,
  QUOTA_BY_USER_PRESETS,
  QUOTA_PRESETS
};
