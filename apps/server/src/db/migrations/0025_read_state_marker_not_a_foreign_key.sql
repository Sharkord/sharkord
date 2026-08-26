PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_channel_read_states` (
	`user_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`last_read_message_id` integer,
	`last_read_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `channel_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_channel_read_states`("user_id", "channel_id", "last_read_message_id", "last_read_at") SELECT "user_id", "channel_id", "last_read_message_id", "last_read_at" FROM `channel_read_states`;--> statement-breakpoint
DROP TABLE `channel_read_states`;--> statement-breakpoint
ALTER TABLE `__new_channel_read_states` RENAME TO `channel_read_states`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `channel_read_states_channel_idx` ON `channel_read_states` (`channel_id`);