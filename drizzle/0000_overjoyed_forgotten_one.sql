CREATE TABLE `credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`encrypted_value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_state` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text NOT NULL
);
