PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`type` text NOT NULL,
	`details` text,
	`ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_activity_log`("id", "user_id", "type", "details", "ip", "created_at") SELECT "id", "user_id", "type", "details", "ip", "created_at" FROM `activity_log`;--> statement-breakpoint
DROP TABLE `activity_log`;--> statement-breakpoint
ALTER TABLE `__new_activity_log` RENAME TO `activity_log`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `activity_log_user_idx` ON `activity_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_log_type_idx` ON `activity_log` (`type`);--> statement-breakpoint
CREATE INDEX `activity_log_created_idx` ON `activity_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `activity_log_user_created_idx` ON `activity_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `activity_log_type_created_idx` ON `activity_log` (`type`,`created_at`);