ALTER TABLE `settings` ADD `server_wizard_completed` integer DEFAULT false NOT NULL;--> statement-breakpoint
-- existing servers are already configured, only fresh installs should see the wizard
UPDATE `settings` SET `server_wizard_completed` = true;
