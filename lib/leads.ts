import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import type { LeadInput } from "./lead-schema";

function dbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const file = url.startsWith("file:") ? url.slice(5) : url;
  return file.startsWith("/") ? file : join(process.cwd(), file);
}

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(dbPath());
    db.exec(`CREATE TABLE IF NOT EXISTS Lead (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      businessType TEXT NOT NULL DEFAULT 'general',
      source TEXT NOT NULL DEFAULT 'contact',
      message TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  }
  return db;
}

export function createLead(input: LeadInput): { id: number } {
  const result = getDb()
    .prepare(
      "INSERT INTO Lead (name, phone, businessType, source, message, fingerprint) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(input.name, input.phone, input.businessType, input.source, input.message ?? null, input.fingerprint ?? null);
  return { id: Number(result.lastInsertRowid) };
}
