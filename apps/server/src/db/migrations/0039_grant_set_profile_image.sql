INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT `role_id`, 'SET_PROFILE_IMAGE', unixepoch() FROM `role_permissions` WHERE `permission` = 'UPLOAD_FILES';
