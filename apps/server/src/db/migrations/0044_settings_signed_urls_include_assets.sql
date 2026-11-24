ALTER TABLE `settings` ADD `storage_signed_urls_include_assets` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `settings` SET `storage_signed_urls_include_assets` = 1 WHERE `storage_signed_urls_enabled` = 1;
