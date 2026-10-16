CREATE TABLE `thread_followers` (
	`user_id` integer NOT NULL,
	`parent_message_id` integer NOT NULL,
	`last_read_message_id` integer,
	`last_reply_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `parent_message_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `thread_followers_parent_idx` ON `thread_followers` (`parent_message_id`);--> statement-breakpoint
CREATE INDEX `thread_followers_user_last_reply_idx` ON `thread_followers` (`user_id`,`last_reply_at`,`parent_message_id`);