#!/usr/bin/env node
// Lightweight migration runner — applies prisma/migrations/*.sql using pg directly.
// No prisma CLI needed; pg is already in the standalone output.
"use strict";

const { Client } = require("pg");
const fs   = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                  VARCHAR(36)  PRIMARY KEY,
      checksum            VARCHAR(64)  NOT NULL,
      finished_at         TIMESTAMPTZ,
      migration_name      VARCHAR(255) NOT NULL UNIQUE,
      logs                TEXT,
      rolled_back_at      TIMESTAMPTZ,
      started_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
      applied_steps_count INT          NOT NULL DEFAULT 0
    )
  `);

  const dir = path.join(__dirname, "prisma", "migrations");
  const entries = fs.readdirSync(dir)
    .filter(d => fs.statSync(path.join(dir, d)).isDirectory())
    .sort();

  for (const name of entries) {
    const sqlPath = path.join(dir, name, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;

    const { rows } = await client.query(
      `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      [name]
    );
    if (rows.length > 0) { console.log(`  ✓ ${name}`); continue; }

    console.log(`  → ${name}`);
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);
    await client.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
       VALUES ($1, $2, $3, now(), 1)
       ON CONFLICT (migration_name) DO UPDATE SET finished_at = now(), applied_steps_count = 1`,
      [randomUUID(), "standalone", name]
    );
    console.log(`  ✓ ${name} applied`);
  }

  await client.end();
  console.log("✅ Migrations complete");
}

run().catch(e => { console.error(e.message); process.exit(1); });
