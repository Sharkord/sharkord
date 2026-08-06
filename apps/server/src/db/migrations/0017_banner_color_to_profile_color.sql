ALTER TABLE `users` ADD `profile_color` text DEFAULT '#262626' NOT NULL;--> statement-breakpoint
UPDATE users SET profile_color = banner_color WHERE banner_color GLOB '#[0-9A-Fa-f]*';--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `banner_color`;
