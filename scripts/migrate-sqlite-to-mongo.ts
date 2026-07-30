/**
 * scripts/migrate-sqlite-to-mongo.ts
 * One-shot migration: reads all Project rows from the old SQLite DB and
 * inserts them into MongoDB via the Prisma client.
 *
 * Usage: bun run scripts/migrate-sqlite-to-mongo.ts [path-to-sqlite-db]
 *        Defaults to db/custom.db
 *
 * Prerequisites:
 *   - .env already points DATABASE_URL to MongoDB
 *   - `prisma generate` and `prisma db push` have been run
 *   - The SQLite file still exists on disk
 */
import { Database } from "bun:sqlite";
import { db } from "../src/lib/db";

interface SqliteRow {
  id: string;
  name: string;
  data: string;
  timetable: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

async function main() {
  const sqlitePath = process.argv[2] || "db/custom.db";
  console.log(`Opening SQLite DB: ${sqlitePath}`);

  const sqlite = new Database(sqlitePath, { readonly: true });
  const rows = sqlite.query("SELECT * FROM Project ORDER BY updatedAt DESC").all() as SqliteRow[];
  console.log(`Found ${rows.length} project(s) in SQLite.\n`);

  if (rows.length === 0) {
    console.log("Nothing to migrate.");
    sqlite.close();
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    // Check if already exists (idempotent re-runs)
    const existing = await db.project.findUnique({ where: { id: row.id } });
    if (existing) {
      console.log(`  SKIP ${row.id} (${row.name}) — already exists`);
      skipped++;
      continue;
    }

    await db.project.create({
      data: {
        id: row.id,
        name: row.name,
        data: row.data,
        timetable: row.timetable,
        status: row.status,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      },
    });
    console.log(`  OK   ${row.id} (${row.name})`);
    migrated++;
  }

  // Verify counts
  const mongoCount = await db.project.count();
  console.log(`\n--- Summary ---`);
  console.log(`SQLite rows:    ${rows.length}`);
  console.log(`Migrated:       ${migrated}`);
  console.log(`Skipped (dups): ${skipped}`);
  console.log(`MongoDB count:  ${mongoCount}`);

  if (mongoCount !== rows.length) {
    console.warn(`⚠️  Count mismatch! Expected ${rows.length}, got ${mongoCount}`);
  } else {
    console.log(`✅ Counts match.`);
  }

  // Spot-check: verify first and last rows parse correctly
  console.log(`\n--- Spot checks ---`);
  for (const row of [rows[0], rows[rows.length - 1]]) {
    if (!row) continue;
    const doc = await db.project.findUnique({ where: { id: row.id } });
    if (!doc) {
      console.error(`  FAIL: ${row.id} not found in MongoDB`);
      continue;
    }
    // Verify JSON blobs parse
    try {
      JSON.parse(doc.data);
      if (doc.timetable) JSON.parse(doc.timetable);
      console.log(`  OK   ${row.id} — data/timetable JSON parses correctly`);
    } catch (e) {
      console.error(`  FAIL ${row.id} — JSON parse error: ${(e as Error).message}`);
    }
    // Verify timestamps
    const origCreated = new Date(row.createdAt).getTime();
    const docCreated = doc.createdAt.getTime();
    if (Math.abs(origCreated - docCreated) > 1000) {
      console.warn(`  WARN ${row.id} — createdAt drift: ${row.createdAt} vs ${doc.createdAt.toISOString()}`);
    }
  }

  sqlite.close();
  console.log("\nMigration complete.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
