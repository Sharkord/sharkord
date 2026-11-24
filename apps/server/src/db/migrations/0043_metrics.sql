CREATE TABLE `metrics_samples` (
	`timestamp` integer PRIMARY KEY NOT NULL,
	`cpu` real NOT NULL,
	`memory` real NOT NULL,
	`system_cpu` real NOT NULL,
	`system_memory_used` real NOT NULL,
	`system_memory_total` real NOT NULL,
	`worker_cpu` real,
	`worker_memory` real,
	`voice_rx` real,
	`voice_tx` real,
	`online_users` real DEFAULT 0 NOT NULL,
	`voice_users` real DEFAULT 0 NOT NULL,
	`voice_producers` real DEFAULT 0 NOT NULL,
	`voice_consumers` real DEFAULT 0 NOT NULL,
	`event_loop_lag` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `settings` ADD `metrics_enabled` integer DEFAULT true NOT NULL;