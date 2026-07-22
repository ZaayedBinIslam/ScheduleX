import { parseFetFile } from "../src/lib/fet/importer";
import { generateFetFile } from "../src/lib/fet/generator";
import { runGeneration } from "../src/lib/fet/runner";
import { readFileSync } from "node:fs";

async function main() {
  const content = readFileSync("FET Example Files/a.fet", "utf8");
  const { project } = parseFetFile(content);

  // 1. Generated file must be valid FET XML (has version attr, students, etc.)
  const xml = generateFetFile(project);
  if (!/<fet version="/.test(xml)) throw new Error("generator missing <fet version>");

  // 2. Full pipeline via real FET (requires FET_BINARY_PATH or detected binary)
  const result = await runGeneration(project);
  console.log("engine:", result.usedEngine, "entries:", result.timetable.entries.length);
  if (result.usedEngine !== "fet") {
    console.log("=== LOG ===");
    console.log(result.log);
    console.log("=== WARNINGS ===");
    console.log(result.warnings);
    throw new Error("Expected FET engine; got " + result.usedEngine + " (set FET_BINARY_PATH)");
  }
  if (result.timetable.entries.length === 0)
    throw new Error("No activities placed — parser/generator regression");
  console.log("ROUND-TRIP OK");
}
main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
