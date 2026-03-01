ALTER TABLE `invites` ADD `role_id` integer REFERENCES roles(id);--> statement-breakpoint
ALTER TABLE `messages` ADD `pinned` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `messages` ADD `pinned_at` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `pinned_by` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `messages` ADD `edited_at` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `edited_by` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_max_avatar_size` integer NOT NULL DEFAULT 3145728;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_max_banner_size` integer NOT NULL DEFAULT 3145728;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_max_files_per_message` integer NOT NULL DEFAULT 10;
