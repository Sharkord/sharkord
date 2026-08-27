ALTER TABLE `users` ADD `oidc_sub` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_oidc_sub_unique` ON `users` (`oidc_sub`);