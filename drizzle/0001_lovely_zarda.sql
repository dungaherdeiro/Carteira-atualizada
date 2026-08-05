CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticker` varchar(16) NOT NULL,
	`level` varchar(64) NOT NULL,
	`whatChanged` text NOT NULL,
	`evidenceDate` varchar(32) NOT NULL,
	`impact` text NOT NULL,
	`thesisStatus` varchar(64) NOT NULL,
	`nextStep` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalValueBrl` decimal(14,2) NOT NULL,
	`previousValueBrl` decimal(14,2),
	`dailyResultBrl` decimal(14,2),
	`dailyResultPct` decimal(10,6),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticker` varchar(16) NOT NULL,
	`eventType` enum('earnings','dividend','assembly','other') NOT NULL,
	`eventDate` varchar(10) NOT NULL,
	`description` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticker` varchar(16) NOT NULL,
	`company` varchar(128) NOT NULL,
	`sector` varchar(128) NOT NULL,
	`quantity` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`),
	CONSTRAINT `positions_ticker_unique` UNIQUE(`ticker`)
);
