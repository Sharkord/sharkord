PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_message_reactions` (
	`message_id` integer NOT NULL,
	`user_id` integer,
	`plugin_id` text,
	`emoji` text NOT NULL,
	`file_id` integer,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`message_id`, `user_id`, `emoji`),
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_message_reactions`("message_id", "user_id", "emoji", "file_id", "created_at") SELECT "message_id", "user_id", "emoji", "file_id", "created_at" FROM `message_reactions`;--> statement-breakpoint
DROP TABLE `message_reactions`;--> statement-breakpoint
ALTER TABLE `__new_message_reactions` RENAME TO `message_reactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `reaction_msg_emoji_plugin_unique_idx` ON `message_reactions` (`message_id`,`emoji`,`plugin_id`);--> statement-breakpoint
CREATE INDEX `reaction_emoji_idx` ON `message_reactions` (`emoji`);--> statement-breakpoint
CREATE INDEX `reaction_user_idx` ON `message_reactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `reaction_msg_emoji_idx` ON `message_reactions` (`message_id`,`emoji`);