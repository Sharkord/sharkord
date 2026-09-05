CREATE TABLE `plugin_capabilities` (
	`plugin_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`mode` text DEFAULT 'public' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`plugin_id`, `type`, `name`)
);
--> statement-breakpoint
CREATE TABLE `plugin_capability_roles` (
	`plugin_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`role_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`plugin_id`, `type`, `name`, `role_id`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plugin_capability_roles_role_idx` ON `plugin_capability_roles` (`role_id`);