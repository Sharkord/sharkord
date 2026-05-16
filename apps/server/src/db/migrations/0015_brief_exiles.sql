ALTER TABLE `roles` ADD `storage_quota_override_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `roles` ADD `storage_space_quota` integer DEFAULT 0 NOT NULL;