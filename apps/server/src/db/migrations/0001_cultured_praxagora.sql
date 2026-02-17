CREATE TABLE `roles_copy` AS SELECT rol.*, false AS is_grouping, ROW_NUMBER() OVER ( ORDER BY id ) AS order_nr FROM `roles` rol;--> statement-breakpoint
DELETE FROM `roles` WHERE 1=1;--> statement-breakpoint
ALTER TABLE `roles` ADD `is_grouping` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `order_nr` integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `roles_order_nr_unique` ON `roles` (`order_nr`);--> statement-breakpoint
INSERT INTO `roles` SELECT * FROM `roles_copy`;--> statement-breakpoint
DROP TABLE `roles_copy`;