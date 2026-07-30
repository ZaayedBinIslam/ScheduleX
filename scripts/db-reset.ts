/**
 * scripts/db-reset.ts
 * Drops the Project collection and re-pushes the Prisma schema.
 * Usage: bun run scripts/db-reset.ts
 */
import { execSync } from "child_process";
import { db } from "../src/lib/db";

async function main() {
  console.log("Dropping Project collection...");
  try {
    await db.$runCommandRaw({ drop: "Project" });
    console.log("  Dropped.");
  } catch {
    console.log("  (collection did not exist, skipping)");
  }

  console.log("Running prisma db push...");
  execSync("bunx prisma db push --force-reset", { stdio: "inherit" });

  console.log("\n✅ Database reset complete.");
}

main()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
