INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'VIEW_USER_SENSITIVE_DATA', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);
