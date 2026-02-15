ALTER TABLE `files` RENAME COLUMN "name" TO "uuid";--> statement-breakpoint
DROP INDEX `files_name_unique`;--> statement-breakpoint
DROP INDEX `files_name_idx`;--> statement-breakpoint
ALTER TABLE `files` ADD `originalSize` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `files` ADD `compressed` integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `files_uuid_unique` ON `files` (`uuid`);--> statement-breakpoint
CREATE INDEX `files_name_idx` ON `files` (`uuid`);