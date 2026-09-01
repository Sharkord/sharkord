PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`original_name` text NOT NULL,
	`md5` text NOT NULL,
	`user_id` integer,
	`plugin_id` text,
	`size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`extension` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_files`("id", "name", "original_name", "md5", "user_id", "size", "mime_type", "extension", "created_at", "updated_at") SELECT "id", "name", "original_name", "md5", "user_id", "size", "mime_type", "extension", "created_at", "updated_at" FROM `files`;--> statement-breakpoint
DROP TABLE `files`;--> statement-breakpoint
ALTER TABLE `__new_files` RENAME TO `files`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `files_name_unique` ON `files` (`name`);--> statement-breakpoint
CREATE INDEX `files_user_idx` ON `files` (`user_id`);--> statement-breakpoint
CREATE INDEX `files_md5_idx` ON `files` (`md5`);--> statement-breakpoint
CREATE INDEX `files_created_idx` ON `files` (`created_at`);--> statement-breakpoint
CREATE INDEX `files_name_idx` ON `files` (`name`);