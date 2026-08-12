import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

let _db: any = null;

export async function getDb() {
  if (!_db) {
    const connection = await mysql.createPool(process.env.DATABASE_URL!);
    _db = drizzle(connection, { schema, mode: "default" });
  }
  return _db;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.openId, openId));
  return user || null;
}

export async function upsertUser(user: { openId: string; name?: string | null; email?: string | null; role?: 'admin' | 'user'; loginMethod?: string | null; lastSignedIn?: Date | null }) {
  const db = await getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.openId, user.openId));
  if (existing) {
    await db.update(schema.users).set({
      name: user.name ?? existing.name,
      email: user.email ?? existing.email,
    }).where(eq(schema.users.openId, user.openId));
    const [updated] = await db.select().from(schema.users).where(eq(schema.users.openId, user.openId));
    return updated;
  }
  await db.insert(schema.users).values({
    openId: user.openId,
    name: user.name || "User",
    email: user.email || "",
    role: user.role || "user",
  });
  const [created] = await db.select().from(schema.users).where(eq(schema.users.openId, user.openId));
  return created;
}

export async function getPositions() {
  const db = await getDb();
  return await db.select().from(schema.positions);
}

export async function getDailyHistory(scope = "consolidated") {
  const db = await getDb();
  return await db.select().from(schema.dailyHistory).where(eq(schema.dailyHistory.portfolioScope, scope));
}

export async function getAlerts() {
  const db = await getDb();
  return await db.select().from(schema.alerts);
}

export async function getEvents() {
  const db = await getDb();
  return await db.select().from(schema.events);
}
