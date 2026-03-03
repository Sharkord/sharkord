ALTER TABLE `users` ADD `social_credit` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE `social_credit_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voter_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`target_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
	`value` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `social_credit_votes_voter_idx` ON `social_credit_votes` (`voter_id`);--> statement-breakpoint
CREATE INDEX `social_credit_votes_target_idx` ON `social_credit_votes` (`target_id`);--> statement-breakpoint
CREATE INDEX `social_credit_votes_voter_target_created_idx` ON `social_credit_votes` (`voter_id`, `target_id`, `created_at`);
