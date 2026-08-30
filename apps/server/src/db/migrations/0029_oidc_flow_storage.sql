CREATE TABLE `oidc_handoffs` (
	`code` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`state` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `oidc_handoffs_expires_idx` ON `oidc_handoffs` (`expires_at`);--> statement-breakpoint
CREATE TABLE `oidc_transactions` (
	`state` text PRIMARY KEY NOT NULL,
	`nonce` text NOT NULL,
	`code_verifier` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `oidc_transactions_expires_idx` ON `oidc_transactions` (`expires_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `oidc_issuer` text;