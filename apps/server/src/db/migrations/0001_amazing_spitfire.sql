CREATE TABLE `external_channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`topic` text,
	`file_access_token` text NOT NULL,
	`file_access_token_updated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `external_channels_file_access_token_unique` ON `external_channels` (`file_access_token`);--> statement-breakpoint
CREATE INDEX `external_channels_type_idx` ON `external_channels` (`type`);--> statement-breakpoint
CREATE TABLE `user_external_channels` (
	`user_id` integer NOT NULL,
	`external_channel_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `external_channel_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`external_channel_id`) REFERENCES `external_channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_external_channels_user_idx` ON `user_external_channels` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_external_channels_external_channels_idx` ON `user_external_channels` (`external_channel_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text,
	`user_id` integer NOT NULL,
	`channel_id` integer,
	`external_channel_id` integer,
	`editable` integer DEFAULT true,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`external_channel_id`) REFERENCES `external_channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "content", "user_id", "channel_id", "external_channel_id", "editable", "metadata", "created_at", "updated_at") SELECT "id", "content", "user_id", "channel_id", NULL, "editable", "metadata", "created_at", "updated_at" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `messages_user_idx` ON `messages` (`user_id`);--> statement-breakpoint
CREATE INDEX `messages_channel_idx` ON `messages` (`channel_id`);--> statement-breakpoint
CREATE INDEX `messages_created_idx` ON `messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `messages_channel_created_idx` ON `messages` (`channel_id`,`created_at`);