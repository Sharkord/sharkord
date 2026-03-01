ALTER TABLE `settings` ADD `direct_messages_enabled` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `settings` ADD `storage_file_sharing_in_direct_messages` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `channels` ADD `is_dm_channel` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE `direct_messages` (
  `channel_id` integer PRIMARY KEY NOT NULL,
  `user_one_id` integer NOT NULL,
  `user_two_id` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_one_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_two_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `direct_messages_pair_unique_idx` ON `direct_messages` (`user_one_id`,`user_two_id`);
--> statement-breakpoint
CREATE INDEX `direct_messages_user_one_idx` ON `direct_messages` (`user_one_id`);
--> statement-breakpoint
CREATE INDEX `direct_messages_user_two_idx` ON `direct_messages` (`user_two_id`);
