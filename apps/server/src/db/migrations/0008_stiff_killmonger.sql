DROP INDEX `channels_file_access_token_unique`;--> statement-breakpoint
ALTER TABLE `channels` DROP COLUMN `file_access_token`;--> statement-breakpoint
ALTER TABLE `channels` DROP COLUMN `file_access_token_updated_at`;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_signed_urls_enabled` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_signed_urls_ttl_seconds` integer NOT NULL;