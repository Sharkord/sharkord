PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text,
	`user_id` integer,
	`plugin_id` text,
	`channel_id` integer NOT NULL,
	`parent_message_id` integer,
	`editable` integer DEFAULT true,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`pinned` integer DEFAULT false,
	`pinned_at` integer,
	`pinned_by` integer,
	`edited_at` integer,
	`edited_by` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pinned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`edited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "content", "user_id", "plugin_id", "channel_id", "parent_message_id", "editable", "metadata", "created_at", "updated_at", "pinned", "pinned_at", "pinned_by", "edited_at", "edited_by") SELECT "id", "content", "user_id", NULL, "channel_id", "parent_message_id", "editable", "metadata", "created_at", "updated_at", "pinned", "pinned_at", "pinned_by", "edited_at", "edited_by" FROM `messages`;--> statement-breakpoint
CREATE TABLE `__backup_message_files` AS SELECT * FROM `message_files`;--> statement-breakpoint
CREATE TABLE `__backup_message_reactions` AS SELECT * FROM `message_reactions`;--> statement-breakpoint
CREATE TABLE `__backup_channel_read_states` AS SELECT * FROM `channel_read_states`;--> statement-breakpoint
DELETE FROM `message_files`;--> statement-breakpoint
DELETE FROM `message_reactions`;--> statement-breakpoint
DELETE FROM `channel_read_states`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
INSERT INTO `message_files` SELECT * FROM `__backup_message_files`;--> statement-breakpoint
INSERT INTO `message_reactions` SELECT * FROM `__backup_message_reactions`;--> statement-breakpoint
INSERT INTO `channel_read_states` SELECT * FROM `__backup_channel_read_states`;--> statement-breakpoint
DROP TABLE `__backup_message_files`;--> statement-breakpoint
DROP TABLE `__backup_message_reactions`;--> statement-breakpoint
DROP TABLE `__backup_channel_read_states`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `messages_user_idx` ON `messages` (`user_id`);--> statement-breakpoint
CREATE INDEX `messages_channel_idx` ON `messages` (`channel_id`);--> statement-breakpoint
CREATE INDEX `messages_created_idx` ON `messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `messages_channel_created_idx` ON `messages` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_parent_idx` ON `messages` (`parent_message_id`);