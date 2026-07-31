/**
 * scripts/migrate-sqlite-to-mongo.ts
 * One-shot migration: reads all Project rows from the old SQLite DB and
 * inserts them into MongoDB via the Prisma client.
 *
 * Exits non-zero on any verification failure — this runs in the production
 * cutover path, so a partial migration must never look like a success.
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
  // Prisma's SQLite connector stores DateTime as integer epoch-ms, but the
  // column default is CURRENT_TIMESTAMP, which yields a string. Both occur.
  createdAt: number | string;
  updatedAt: number | string;
}

/**
 * SQLite DateTime -> Date.
 *
 * Prisma writes epoch-ms integers. Rows created outside Prisma (e.g. via the
 * column's CURRENT_TIMESTAMP default) hold "YYYY-MM-DD HH:MM:SS", which is UTC
 * in SQLite but which `new Date()` would parse as *local* time — silently
 * shifting every timestamp by the machine's UTC offset. Normalise explicitly.
 */
function toDate(value: number | string, field: string, id: string): Date {
  let date: Date;
  if (typeof value === "number") {
    date = new Date(value);
  } else if (/^\d+$/.test(value)) {
    date = new Date(Number(value));
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
    date = new Date(`${value.replace(" ", "T")}Z`); // SQLite stores this as UTC
  } else {
    date = new Date(value); // ISO-8601 with an explicit offset
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Row ${id}: unparseable ${field} value ${JSON.stringify(value)}`);
  }
  return date;
}

async function main() {
  const sqlitePath = process.argv[2] || "db/custom.db";
  console.log(`Opening SQLite DB: ${sqlitePath}`);

  const sqlite = new Database(sqlitePath, { readonly: true });
  const rows = sqlite
    .query("SELECT * FROM Project ORDER BY updatedAt DESC")
    .all() as SqliteRow[];
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
        createdAt: toDate(row.createdAt, "createdAt", row.id),
        updatedAt: toDate(row.updatedAt, "updatedAt", row.id),
      },
    });
    console.log(`  OK   ${row.id} (${row.name})`);
    migrated++;
  }

  const failures: string[] = [];

  // Verify every SQLite row landed, rather than comparing against the whole
  // collection — MongoDB may legitimately hold projects SQLite never had.
  console.log(`\n--- Summary ---`);
  console.log(`SQLite rows:    ${rows.length}`);
  console.log(`Migrated:       ${migrated}`);
  console.log(`Skipped (dups): ${skipped}`);
  console.log(`Total in Mongo: ${await db.project.count()}`);

  if (migrated + skipped !== rows.length) {
    failures.push(
      `Accounted for ${migrated + skipped} of ${rows.length} SQLite rows`
    );
  }

  // Verify each migrated row round-trips: present, JSON intact, timestamps kept.
  console.log(`\n--- Verification ---`);
  for (const row of rows) {
    const doc = await db.project.findUnique({ where: { id: row.id } });
    if (!doc) {
      failures.push(`${row.id} not found in MongoDB`);
      console.error(`  FAIL ${row.id} — not found`);
      continue;
    }

    try {
      JSON.parse(doc.data);
      if (doc.timetable) JSON.parse(doc.timetable);
    } catch (e) {
      failures.push(`${row.id} JSON parse error: ${(e as Error).message}`);
      console.error(`  FAIL ${row.id} — JSON parse error`);
      continue;
    }

    let drifted = false;
    for (const [field, source, stored] of [
      ["createdAt", row.createdAt, doc.createdAt],
      ["updatedAt", row.updatedAt, doc.updatedAt],
    ] as const) {
      const drift = Math.abs(
        toDate(source, field, row.id).getTime() - stored.getTime()
      );
      if (drift > 1000) {
        failures.push(`${row.id} ${field} drift of ${drift}ms`);
        console.error(`  FAIL ${row.id} — ${field} drift of ${drift}ms`);
        drifted = true;
      }
    }

    if (!drifted) console.log(`  OK   ${row.id}`);
  }

  sqlite.close();

  if (failures.length > 0) {
    console.error(`\n❌ Migration failed ${failures.length} check(s):`);
    for (const f of failures) console.error(`   - ${f}`);
    process.exit(1);
  }

  console.log("\n✅ All rows verified. Migration complete.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
