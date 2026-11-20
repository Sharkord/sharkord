ALTER TABLE `settings` ADD `enable_link_previews` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_media_proxy_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_media_proxy_max_size` integer DEFAULT 104857600 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_media_proxy_timeout_seconds` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_media_proxy_cache_seconds` integer DEFAULT 86400 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_media_proxy_max_redirects` integer DEFAULT 3 NOT NULL;