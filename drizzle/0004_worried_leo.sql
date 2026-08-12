ALTER TABLE `positions` ADD `account` varchar(64) DEFAULT 'Consolidado' NOT NULL;--> statement-breakpoint
ALTER TABLE `positions` ADD `positionType` varchar(32) DEFAULT 'quoted_b3' NOT NULL;--> statement-breakpoint
ALTER TABLE `positions` ADD `sourceMarketValue` decimal(14,2);--> statement-breakpoint
ALTER TABLE `positions` ADD `sourceReturnPct` decimal(10,4);