ALTER TABLE `messages` ADD `parent_message_id` integer;--> statement-breakpoint
CREATE INDEX `messages_parent_idx` ON `messages` (`parent_message_id`);