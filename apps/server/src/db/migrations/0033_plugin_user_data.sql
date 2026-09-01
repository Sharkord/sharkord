CREATE TABLE `plugin_user_data` (
	`plugin_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`plugin_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_user_data_user_idx` ON `plugin_user_data` (`user_id`);