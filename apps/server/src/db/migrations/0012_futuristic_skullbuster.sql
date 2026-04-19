ALTER TABLE `messages` ADD `reply_to_message_id` integer;--> statement-breakpoint
CREATE INDEX `messages_reply_to_idx` ON `messages` (`reply_to_message_id`);