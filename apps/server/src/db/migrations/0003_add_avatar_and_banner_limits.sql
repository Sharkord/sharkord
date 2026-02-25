ALTER TABLE `settings` ADD `storage_max_avatar_size` integer NOT NULL DEFAULT 3145728;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_max_banner_size` integer NOT NULL DEFAULT 3145728;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_max_files_per_message` integer NOT NULL DEFAULT 10;
