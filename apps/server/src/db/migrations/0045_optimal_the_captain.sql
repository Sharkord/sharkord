CREATE TABLE `file_views` (
	`file_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`file_id`, `user_id`),
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `file_views_user_idx` ON `file_views` (`user_id`);--> statement-breakpoint
ALTER TABLE `files` ADD `view_once` integer DEFAULT false NOT NULL;