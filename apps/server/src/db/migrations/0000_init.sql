CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`original_name` text NOT NULL,
	`md5` text NOT NULL,
	`user_id` integer NOT NULL,
	`size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`extension` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `files_name_unique` ON `files` (`name`);--> statement-breakpoint
CREATE INDEX `files_user_idx` ON `files` (`user_id`);--> statement-breakpoint
CREATE INDEX `files_md5_idx` ON `files` (`md5`);--> statement-breakpoint
CREATE INDEX `files_created_idx` ON `files` (`created_at`);--> statement-breakpoint
CREATE INDEX `files_name_idx` ON `files` (`name`);--> statement-breakpoint
CREATE TABLE `settings` (
	`name` text NOT NULL,
	`description` text,
	`password` text,
	`server_id` text NOT NULL,
	`secret_token` text,
	`logo_id` integer REFERENCES `files`(`id`) ON DELETE set null,
	`allow_new_users` integer NOT NULL,
	`direct_messages_enabled` integer NOT NULL,
	`storage_uploads_enabled` integer NOT NULL,
	`storage_quota` integer NOT NULL,
	`storage_upload_max_file_size` integer NOT NULL,
	`storage_max_avatar_size` integer NOT NULL,
	`storage_max_banner_size` integer NOT NULL,
	`storage_max_files_per_message` integer NOT NULL,
	`storage_file_sharing_in_direct_messages` integer NOT NULL,
	`storage_space_quota_by_user` integer NOT NULL,
	`storage_overflow_action` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `settings_server_idx` ON `settings` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `settings_server_unique_idx` ON `settings` (`server_id`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#ffffff' NOT NULL,
	`is_persistent` integer NOT NULL,
	`is_default` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `roles_is_default_idx` ON `roles` (`is_default`);--> statement-breakpoint
CREATE INDEX `roles_is_persistent_idx` ON `roles` (`is_persistent`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `categories_position_idx` ON `categories` (`position`);--> statement-breakpoint
CREATE TABLE `channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`topic` text,
	`file_access_token` text NOT NULL,
	`file_access_token_updated_at` integer NOT NULL,
	`private` integer DEFAULT false NOT NULL,
	`is_dm_channel` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	`category_id` integer REFERENCES `categories`(`id`) ON DELETE cascade,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channels_file_access_token_unique` ON `channels` (`file_access_token`);--> statement-breakpoint
CREATE INDEX `channels_category_idx` ON `channels` (`category_id`);--> statement-breakpoint
CREATE INDEX `channels_position_idx` ON `channels` (`position`);--> statement-breakpoint
CREATE INDEX `channels_type_idx` ON `channels` (`type`);--> statement-breakpoint
CREATE INDEX `channels_category_position_idx` ON `channels` (`category_id`, `position`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identity` text NOT NULL,
	`password` text NOT NULL,
	`name` text NOT NULL,
	`avatar_id` integer REFERENCES `files`(`id`) ON DELETE set null,
	`banner_id` integer REFERENCES `files`(`id`) ON DELETE set null,
	`bio` text,
	`banned` integer DEFAULT false NOT NULL,
	`ban_reason` text,
	`banned_at` integer,
	`banner_color` text,
	`last_login_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_identity_idx` ON `users` (`identity`);--> statement-breakpoint
CREATE INDEX `users_name_idx` ON `users` (`name`);--> statement-breakpoint
CREATE INDEX `users_banned_idx` ON `users` (`banned`);--> statement-breakpoint
CREATE INDEX `users_last_login_idx` ON `users` (`last_login_at`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`role_id` integer NOT NULL REFERENCES `roles`(`id`) ON DELETE cascade,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `role_id`)
);
--> statement-breakpoint
CREATE INDEX `user_roles_user_idx` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_roles_role_idx` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE TABLE `logins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`user_agent` text,
	`os` text,
	`device` text,
	`ip` text,
	`hostname` text,
	`city` text,
	`region` text,
	`country` text,
	`loc` text,
	`org` text,
	`postal` text,
	`timezone` text,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `logins_user_idx` ON `logins` (`user_id`);--> statement-breakpoint
CREATE INDEX `logins_ip_idx` ON `logins` (`ip`);--> statement-breakpoint
CREATE INDEX `logins_created_idx` ON `logins` (`created_at`);--> statement-breakpoint
CREATE INDEX `logins_user_created_idx` ON `logins` (`user_id`, `created_at`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text,
	`user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`channel_id` integer NOT NULL REFERENCES `channels`(`id`) ON DELETE cascade,
	`parent_message_id` integer,
	`reply_to_message_id` integer,
	`editable` integer DEFAULT true,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`pinned` integer DEFAULT false,
	`pinned_at` integer,
	`pinned_by` integer REFERENCES `users`(`id`) ON DELETE set null,
	`edited_at` integer,
	`edited_by` integer REFERENCES `users`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_user_idx` ON `messages` (`user_id`);--> statement-breakpoint
CREATE INDEX `messages_channel_idx` ON `messages` (`channel_id`);--> statement-breakpoint
CREATE INDEX `messages_created_idx` ON `messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `messages_channel_created_idx` ON `messages` (`channel_id`, `created_at`);--> statement-breakpoint
CREATE INDEX `messages_parent_idx` ON `messages` (`parent_message_id`);--> statement-breakpoint
CREATE INDEX `messages_reply_to_idx` ON `messages` (`reply_to_message_id`);--> statement-breakpoint
CREATE TABLE `message_files` (
	`message_id` integer NOT NULL REFERENCES `messages`(`id`) ON DELETE cascade,
	`file_id` integer NOT NULL REFERENCES `files`(`id`) ON DELETE cascade,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	PRIMARY KEY(`message_id`, `file_id`)
);
--> statement-breakpoint
CREATE INDEX `message_files_msg_idx` ON `message_files` (`message_id`);--> statement-breakpoint
CREATE INDEX `message_files_file_idx` ON `message_files` (`file_id`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` integer NOT NULL REFERENCES `roles`(`id`) ON DELETE cascade,
	`permission` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	PRIMARY KEY(`role_id`, `permission`)
);
--> statement-breakpoint
CREATE INDEX `role_permissions_role_idx` ON `role_permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `role_permissions_permission_idx` ON `role_permissions` (`permission`);--> statement-breakpoint
CREATE TABLE `emojis` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`file_id` integer NOT NULL REFERENCES `files`(`id`) ON DELETE cascade,
	`user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `emojis_user_idx` ON `emojis` (`user_id`);--> statement-breakpoint
CREATE INDEX `emojis_file_idx` ON `emojis` (`file_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `emojis_name_idx` ON `emojis` (`name`);--> statement-breakpoint
CREATE TABLE `message_reactions` (
	`message_id` integer NOT NULL REFERENCES `messages`(`id`) ON DELETE cascade,
	`user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`emoji` text NOT NULL,
	`file_id` integer REFERENCES `files`(`id`) ON DELETE set null,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`message_id`, `user_id`, `emoji`)
);
--> statement-breakpoint
CREATE INDEX `reaction_msg_idx` ON `message_reactions` (`message_id`);--> statement-breakpoint
CREATE INDEX `reaction_emoji_idx` ON `message_reactions` (`emoji`);--> statement-breakpoint
CREATE INDEX `reaction_user_idx` ON `message_reactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `reaction_msg_emoji_idx` ON `message_reactions` (`message_id`, `emoji`);--> statement-breakpoint
CREATE TABLE `invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`creator_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`role_id` integer REFERENCES `roles`(`id`) ON DELETE set null,
	`max_uses` integer,
	`uses` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invites_code_idx` ON `invites` (`code`);--> statement-breakpoint
CREATE INDEX `invites_creator_idx` ON `invites` (`creator_id`);--> statement-breakpoint
CREATE INDEX `invites_expires_idx` ON `invites` (`expires_at`);--> statement-breakpoint
CREATE INDEX `invites_uses_idx` ON `invites` (`uses`);--> statement-breakpoint
CREATE TABLE `activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`type` text NOT NULL,
	`details` text,
	`ip` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_log_user_idx` ON `activity_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_log_type_idx` ON `activity_log` (`type`);--> statement-breakpoint
CREATE INDEX `activity_log_created_idx` ON `activity_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `activity_log_user_created_idx` ON `activity_log` (`user_id`, `created_at`);--> statement-breakpoint
CREATE INDEX `activity_log_type_created_idx` ON `activity_log` (`type`, `created_at`);--> statement-breakpoint
CREATE TABLE `channel_role_permissions` (
	`channel_id` integer NOT NULL REFERENCES `channels`(`id`) ON DELETE cascade,
	`role_id` integer NOT NULL REFERENCES `roles`(`id`) ON DELETE cascade,
	`permission` text NOT NULL,
	`allow` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	PRIMARY KEY(`channel_id`, `role_id`, `permission`)
);
--> statement-breakpoint
CREATE INDEX `channel_role_permissions_channel_idx` ON `channel_role_permissions` (`channel_id`);--> statement-breakpoint
CREATE INDEX `channel_role_permissions_role_idx` ON `channel_role_permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `channel_role_permissions_channel_perm_idx` ON `channel_role_permissions` (`channel_id`, `permission`);--> statement-breakpoint
CREATE INDEX `channel_role_permissions_role_perm_idx` ON `channel_role_permissions` (`role_id`, `permission`);--> statement-breakpoint
CREATE INDEX `channel_role_permissions_allow_idx` ON `channel_role_permissions` (`allow`);--> statement-breakpoint
CREATE TABLE `channel_user_permissions` (
	`channel_id` integer NOT NULL REFERENCES `channels`(`id`) ON DELETE cascade,
	`user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`permission` text NOT NULL,
	`allow` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	PRIMARY KEY(`channel_id`, `user_id`, `permission`)
);
--> statement-breakpoint
CREATE INDEX `channel_user_permissions_channel_idx` ON `channel_user_permissions` (`channel_id`);--> statement-breakpoint
CREATE INDEX `channel_user_permissions_user_idx` ON `channel_user_permissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `channel_user_permissions_channel_perm_idx` ON `channel_user_permissions` (`channel_id`, `permission`);--> statement-breakpoint
CREATE INDEX `channel_user_permissions_user_perm_idx` ON `channel_user_permissions` (`user_id`, `permission`);--> statement-breakpoint
CREATE INDEX `channel_user_permissions_allow_idx` ON `channel_user_permissions` (`allow`);--> statement-breakpoint
CREATE TABLE `channel_read_states` (
	`user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`channel_id` integer NOT NULL REFERENCES `channels`(`id`) ON DELETE cascade,
	`last_read_message_id` integer REFERENCES `messages`(`id`) ON DELETE set null,
	`last_read_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `channel_id`)
);
--> statement-breakpoint
CREATE INDEX `channel_read_states_user_idx` ON `channel_read_states` (`user_id`);--> statement-breakpoint
CREATE INDEX `channel_read_states_channel_idx` ON `channel_read_states` (`channel_id`);--> statement-breakpoint
CREATE INDEX `channel_read_states_last_read_idx` ON `channel_read_states` (`last_read_message_id`);--> statement-breakpoint
CREATE TABLE `direct_messages` (
	`channel_id` integer NOT NULL REFERENCES `channels`(`id`) ON DELETE cascade,
	`user_one_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`user_two_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`channel_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `direct_messages_pair_unique_idx` ON `direct_messages` (`user_one_id`, `user_two_id`);--> statement-breakpoint
CREATE INDEX `direct_messages_user_one_idx` ON `direct_messages` (`user_one_id`);--> statement-breakpoint
CREATE INDEX `direct_messages_user_two_idx` ON `direct_messages` (`user_two_id`);
