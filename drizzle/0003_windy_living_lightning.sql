ALTER TABLE `positions` DROP INDEX `positions_ticker_unique`;--> statement-breakpoint
ALTER TABLE `positions` MODIFY COLUMN `ticker` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `positions` ADD `currency` enum('BRL','USD') DEFAULT 'BRL' NOT NULL;--> statement-breakpoint
ALTER TABLE `positions` ADD `accountHolder` varchar(64) DEFAULT 'Consolidado' NOT NULL;--> statement-breakpoint
ALTER TABLE `positions` ADD `assetClass` varchar(64) DEFAULT 'Ações' NOT NULL;