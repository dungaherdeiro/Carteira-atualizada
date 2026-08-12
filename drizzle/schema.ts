import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Portfolio positions — supports Brazilian assets and global USD investments.
 */
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  ticker: varchar("ticker", { length: 32 }).notNull(),
  company: varchar("company", { length: 128 }).notNull(),
  sector: varchar("sector", { length: 128 }).notNull(),
  quantity: int("quantity").notNull(),
  averageBuyPrice: decimal("averageBuyPrice", { precision: 12, scale: 4 }),
  currency: mysqlEnum("currency", ["BRL", "USD"]).default("BRL").notNull(),
  accountHolder: varchar("accountHolder", { length: 64 }).default("Consolidado").notNull(),
  account: varchar("account", { length: 64 }).default("Consolidado").notNull(),
  assetClass: varchar("assetClass", { length: 64 }).default("Ações").notNull(),
  positionType: varchar("positionType", { length: 32 }).default("quoted_b3").notNull(),
  sourceMarketValue: decimal("sourceMarketValue", { precision: 14, scale: 2 }),
  sourceInvestedValue: decimal("sourceInvestedValue", { precision: 14, scale: 2 }),
  sourceReturnValue: decimal("sourceReturnValue", { precision: 14, scale: 2 }),
  sourceReturnPct: decimal("sourceReturnPct", { precision: 10, scale: 4 }),
  sourceAsOfDate: varchar("sourceAsOfDate", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

/**
 * Daily portfolio snapshots — historical evolution of total value and daily result.
 */
export const dailyHistory = mysqlTable("daily_history", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  portfolioScope: varchar("portfolioScope", { length: 32 }).default("legacy_b3").notNull(),
  totalValueBrl: decimal("totalValueBrl", { precision: 14, scale: 2 }).notNull(),
  previousValueBrl: decimal("previousValueBrl", { precision: 14, scale: 2 }),
  dailyResultBrl: decimal("dailyResultBrl", { precision: 14, scale: 2 }),
  dailyResultPct: decimal("dailyResultPct", { precision: 10, scale: 6 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyHistory = typeof dailyHistory.$inferSelect;
export type InsertDailyHistory = typeof dailyHistory.$inferInsert;

/**
 * Material alerts — restricted to SMTO3, BMOB3, JHSF3, ORVR3.
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  ticker: varchar("ticker", { length: 16 }).notNull(),
  level: varchar("level", { length: 64 }).notNull(),
  whatChanged: text("whatChanged").notNull(),
  evidenceDate: varchar("evidenceDate", { length: 32 }).notNull(),
  impact: text("impact").notNull(),
  thesisStatus: varchar("thesisStatus", { length: 64 }).notNull(),
  nextStep: text("nextStep").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Corporate events calendar — earnings, dividends, assemblies.
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  ticker: varchar("ticker", { length: 16 }).notNull(),
  eventType: mysqlEnum("eventType", ["earnings", "dividend", "assembly", "other"]).notNull(),
  eventDate: varchar("eventDate", { length: 10 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
