/**
 * scripts/db-reset.ts
 * Drops the ENTIRE database named in DATABASE_URL, then re-pushes the Prisma
 * schema. `prisma db push --force-reset` resets the whole database, not just
 * the Project collection — anything else living in it is destroyed too.
 *
 * Usage: bun run scripts/db-reset.ts [--yes]
 *        --yes skips the confirmation prompt (for scripted/CI use)
 */
import { execSync } from "child_process";
import { createInterface } from "readline/promises";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(1);
}

/** The database name is the path segment of the connection string. */
function databaseName(connectionString: string): string {
  return connectionString.split("?")[0].split("/").pop() || "(default)";
}

/** Hosts we consider safe to wipe without extra friction. */
function isLocal(connectionString: string): boolean {
  return /(@|\/\/)(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
}

async function confirm(question: string, expected: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.error("Not a TTY — cannot prompt. Re-run with --yes if you mean it.");
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim() === expected;
  } finally {
    rl.close();
  }
}

async function main() {
  const name = databaseName(url!);
  const remote = !isLocal(url!);
  console.log(`Target database: ${name}${remote ? "  (REMOTE HOST)" : "  (local)"}`);

  if (!process.argv.includes("--yes")) {
    if (remote) {
      console.log(
        "\n⚠️  DATABASE_URL does not point at localhost. This destroys every\n" +
          "   document in this database. If this is production, stop now."
      );
      if (!(await confirm(`Type the database name (${name}) to continue: `, name))) {
        console.log("Aborted.");
        process.exit(1);
      }
    } else if (
      !(await confirm("This destroys all local data. Type 'yes' to continue: ", "yes"))
    ) {
      console.log("Aborted.");
      process.exit(1);
    }
  }

  console.log("Running prisma db push --force-reset...");
  execSync("bunx prisma db push --force-reset", { stdio: "inherit" });

  console.log("\n✅ Database reset complete.");
}

main().catch((e) => {
  console.error("Reset failed:", e);
  process.exit(1);
});
