# FET Timetable Generator — Remediation Plan (Agent Execution Spec)

> **Audience:** an AI coding agent executing with no prior conversation context.
> **Goal:** fix the confirmed bugs in this FET-based university timetable generator, in priority order, without regressing the working parts.
> Every task below is self-contained: it states the file, the problem, the exact change, and how to verify it.

---

## 0. Project context & environment (read first)

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Zustand store, Prisma + SQLite, Tailwind/shadcn UI. Runtime is **Bun**.
- **What the app does:** collects timetable inputs/constraints through a wizard, generates a `.fet` XML file, runs the external **FET** engine (`fet-cl`) to solve it, parses FET's output back into a timetable, and renders it. If FET isn't found it uses an internal greedy "fallback" scheduler.
- **Core engine code lives in `src/lib/fet/`:**
  - `generator.ts` — Project → `.fet` XML.
  - `parser.ts` — FET output dir → `Timetable`.
  - `importer.ts` — `.fet` XML → Project.
  - `runner.ts` — detects the FET binary, runs it, orchestrates fallback.
  - `scheduler.ts` — internal greedy fallback scheduler.
  - `resolve.ts` — id→name helpers, student-set expansion, XML escaping.
  - `validate.ts` — pre-generation validation.
  - `projectService.ts` — DB persistence (Prisma).
  - `types.ts` — all data types.
- **API routes:** `src/app/api/projects/**` (list/create/get/update/delete, `generate`, `export`, `import`) and `src/app/api/fet-status`.
- **Key UI:** `src/components/app/GeneratePage.tsx`, `src/components/wizard/StepConstraints.tsx`.

### Commands
```bash
bun install
bun run lint                 # eslint
bunx tsc --noEmit            # type-check (must stay clean)
bun run dev                  # dev server on :3000
bun <script>.ts              # run a one-off TS script
```

### FET binary (for local verification)
FET **7.8.7** is installed at `D:\Programs\fet\fet-7.8.7\` (`fet-cl.exe`). It is **not on PATH**. Run it directly:
```bash
/d/Programs/fet/fet-7.8.7/fet-cl.exe --inputfile=INPUT.fet --outputdir=OUTDIR
```
FET writes results to `OUTDIR/timetables/<basename>/<basename>_activities.xml` (each `<Activity>` has only `<Id>/<Day>/<Hour>/<Room>`), and any parse/solve errors to `OUTDIR/logs/errors.txt`. A real sample input is `FET Example Files/a.fet`.

### Verified FET facts (do NOT "fix" these — they are correct)
- `ConstraintMinNDaysBetweenActivities` with `<MinDays>` **is** a valid legacy tag FET accepts. Leave it.
- `ConstraintActivityPreferredStartingTime` with `<Preferred_Day>/<Preferred_Hour>` **is** honored by FET. Leave it.
- The generator's overall output already parses in FET and places all activities (873/873 on the sample). Don't rewrite it wholesale — make the surgical changes below.

### Guardrails
- Keep the import → generate → FET round-trip working (there is a verification task for this at the end — Task 16).
- `bunx tsc --noEmit` and `bun run lint` must pass after every task.
- Do not add new heavyweight dependencies; `zod` and `next-auth` are already installed.
- Work on a new branch: `git checkout -b fix/audit-remediation`.

---

## PHASE 1 — Make FET actually run (Critical/High)

### Task 1 — Detect the FET binary reliably (P0)
**File:** `src/lib/fet/runner.ts` → `detectFetBinary()` (~lines 36–77).

**Problem:** The candidate list only contains PATH names and hardcoded **Linux** absolute paths. On Windows, FET installed outside PATH is never found, so the app silently uses the fallback scheduler for every generation. The probe also accepts *any* binary that prints output under `--version` (false positives).

**Change:**
1. Build the candidate list from, in order: (a) the `explicit` arg, (b) `process.env.FET_BINARY_PATH`, (c) PATH names (`fet-cl`, `fet-cl.exe`, `fet`, `fet-cli`), (d) platform install locations that actually exist on disk.
2. For Windows, enumerate common install roots and pick existing `fet-cl.exe`. Because installs are versioned (`fet-7.8.7`), scan parent dirs:
   ```ts
   import { existsSync, readdirSync } from "node:fs";
   import { join } from "node:path";

   function windowsFetCandidates(): string[] {
     const roots = [
       "C:\\Program Files\\FET",
       "C:\\Program Files (x86)\\FET",
       "C:\\Program Files\\fet",
       "D:\\Programs\\fet",
     ];
     const out: string[] = [];
     for (const root of roots) {
       if (!existsSync(root)) continue;
       // direct
       for (const exe of ["fet-cl.exe", "fet-cl.bat", "fet.exe"]) {
         const p = join(root, exe);
         if (existsSync(p)) out.push(p);
       }
       // versioned subfolders (e.g. fet-7.8.7)
       try {
         for (const sub of readdirSync(root)) {
           for (const exe of ["fet-cl.exe", "fet-cl.bat"]) {
             const p = join(root, sub, exe);
             if (existsSync(p)) out.push(p);
           }
         }
       } catch { /* ignore */ }
     }
     return out;
   }
   ```
3. Keep the Unix absolute paths only when `process.platform !== "win32"`.
4. Tighten the accept condition: require the probe output to contain `/fet/i` **or** a version number `\d+\.\d+\.\d+`. Remove the `args[0] === "--version"` catch-all that accepts any binary.

**Acceptance:** With FET at `D:\Programs\fet\fet-7.8.7\`, `detectFetBinary()` returns `{ path: <resolved fet-cl.exe>, version: "7.8.7" }`. With `FET_BINARY_PATH` set, that path wins. When nothing exists, returns `{ path: null, version: null }`.

**Verify:**
```bash
bun -e 'import("./src/lib/fet/runner").then(m=>m.detectFetBinary()).then(console.log)'
```
Expect a non-null path + version `7.8.7`.

---

### Task 2 — Don't let the UI force fallback when FET is available (P0)
**File:** `src/components/app/GeneratePage.tsx` (~lines 54–58).

**Problem:**
```ts
const res = await generateTimetable(id, {
  forceFallback: forceFallback || !fetAvailable,   // <-- forces fallback whenever detection failed
  binaryPath: binaryPath.trim() || undefined,
});
```
Two bugs: (a) if detection failed for any reason, generation is forced to fallback even when the user typed a valid `binaryPath`; (b) the server already falls back on its own when FET is missing, so the client shouldn't pre-decide.

**Change:** send only the user's explicit choice:
```ts
forceFallback: forceFallback,
binaryPath: binaryPath.trim() || undefined,
```
Let the server (`runGeneration`) decide: if a `binaryPath` is provided or one is detected, use FET; otherwise fall back.

**Acceptance:** With FET detected, generating runs the FET engine (`result.engine === "fet"`). Typing a valid binary path also runs FET. Checking "Force internal fallback scheduler" still uses fallback.

---

### Task 3 — Fix Windows `spawn` arg quoting / shell usage (P1)
**File:** `src/lib/fet/runner.ts` → `run()` (~lines 170–216).

**Problem:** On Windows the child is spawned with `shell: true` and unquoted args. Temp files live under `os.tmpdir()` (`C:\Users\<name>\AppData\Local\Temp\...`). If `<name>` contains a space, `--inputfile=<path with space>` is word-split by the shell and FET receives a broken path → fails → silent fallback.

**Change (preferred):** now that Task 1 resolves an absolute `.exe` path, spawn **without a shell**:
```ts
const child = spawn(bin, args, {
  env: process.env,
  cwd: process.cwd(),
  shell: false,
  windowsHide: true,
});
```
`spawn` with `shell:false` passes each arg as-is (no word-splitting), so paths with spaces work. If a resolved path ends in `.bat`/`.cmd`, set `shell: true` **only for that case** and wrap the file-path args in quotes. Add a short comment explaining why.

**Acceptance:** Generation succeeds when the temp/output path contains a space. Add a quick manual check by pointing `binaryPath` at the real exe and generating a small project whose temp dir has a space (or simulate by running FET via the runner against a path with a space).

---

### Task 4 — Robust FET output-file discovery (P1)
**File:** `src/lib/fet/parser.ts` → `findActivitiesFile()` (~lines 139–173).

**Problem:** The primary matcher `/^activities.*\.xml$/i` never matches FET's real filename `<basename>_activities.xml`. It falls back to "first `.xml` whose text `.includes("<Activity")`", which relies on `readdirSync` ordering (works on NTFS by alphabetical luck; can pick `_teachers.xml`/`_subgroups.xml` on Linux → empty/duplicated timetable). `.includes("<Activity")` also matches `<Activity_Tag>`.

**Change:** prefer a filename ending in `_activities.xml` (or exactly `activities.xml`), recursively:
```ts
function findActivitiesFile(dir: string): string | null {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return null; }

  // 1. Prefer the canonical FET output name at this level.
  const direct = entries.find((e) => /(^|_)activities\.xml$/i.test(e));
  if (direct) return join(dir, direct);

  // 2. Recurse into subdirectories (FET writes to timetables/<basename>/).
  for (const e of entries) {
    const full = join(dir, e);
    try { if (statSync(full).isDirectory()) {
      const found = findActivitiesFile(full);
      if (found) return found;
    } } catch { /* ignore */ }
  }

  // 3. Last resort: an xml that actually contains <Activity> blocks (not just <Activity_Tag>).
  for (const e of entries) {
    if (!/\.xml$/i.test(e)) continue;
    try {
      const content = readFileSync(join(dir, e), "utf8");
      if (/<Activity>/.test(content)) return join(dir, e);
    } catch { /* ignore */ }
  }
  return null;
}
```

**Acceptance:** Given a real FET output dir (produce one with the FET command in §0), `findActivitiesFile` returns the `*_activities.xml` file regardless of directory-entry ordering.

**Verify:** run FET on `FET Example Files/a.fet`, then point the parser at the output dir and confirm it parses 873 placed activities.

---

### Task 5 — Surface real FET failures instead of silently falling back (P1)
**Files:** `src/lib/fet/runner.ts` (`runFetCli`, `runGeneration`), `src/lib/fet/parser.ts` (read error log), `src/components/app/GeneratePage.tsx` (display).

**Problem:** In `runGeneration`, any FET error is caught and the greedy fallback runs instead, labeled `engine:"fallback"`, with the FET error buried in a log line. FET's detailed `logs/errors.txt` is never read. Users can't tell "FET rejected my constraints" from "FET isn't installed," and silently receive a different-quality timetable.

**Change:**
1. In `runFetCli`, after the process finishes, read `join(outDir, "logs", "errors.txt")` and `logs/warnings.txt` if present (strip a leading BOM / NUL bytes), and include their contents in the thrown error message / returned warnings.
2. In the `run()` close handler, don't treat exit code `1` as unconditional success — if no activities file is found **and** `errors.txt` is non-empty, throw with the FET error text.
3. In `runGeneration`, distinguish three outcomes in the returned result/log:
   - FET not found → fallback (informational).
   - FET found but **failed** (parse/solve error) → still fall back, but set a clearly-worded warning like `"FET engine reported an error and was not used: <first line of errors.txt>. Showing fallback-scheduler result."` and include it in `warnings`.
4. In `GeneratePage`, render that warning prominently (it already renders `result.warnings`; ensure a fallback-due-to-error case is visually distinct from a clean fallback).

**Acceptance:** Feed FET a deliberately broken constraint (e.g. a constraint referencing a duplicate activity id) and confirm the UI shows the FET error text and states it fell back — instead of silently presenting a fallback timetable as if it were FET's.

---

## PHASE 2 — Correctness (Critical/Medium)

### Task 6 — Stop dropping students for Year/Group assignments (P0)
**Files:** `src/lib/fet/generator.ts` (activities loop), `src/lib/fet/resolve.ts` (`expandStudentSet`, `activityStudentCount`).

**Problem:** `activitySubgroups` → `expandStudentSet` expand a student set to leaf subgroups. A Year or Group **without subgroups** expands to `[]`, so the generated `<Activity>` gets **zero `<Students>` tags** — FET schedules it with no student-conflict awareness and per-year/group views are empty. Confirmed: assigning an activity to a subgroup-less year yields no `<Students>` output. FET accepts Year/Group **names** directly as student sets, so expansion to subgroups is unnecessary in the generated file.

**Change A — generator (emit the assigned sets by name, not expanded):**
In `generateFetFile`, replace the block that iterates `activitySubgroups(p, a)` and emits `<Students>` (currently ~lines 113–116) with emission of each **assigned** student-set id resolved to its FET name:
```ts
for (const sId of a.students) {
  const name = studentDisplayName(p, sId); // returns the id if unknown
  if (name && name !== sId) {              // only emit resolved sets
    lines.push(`\t\t<Students>${esc(name)}</Students>`);
  }
}
```
(`studentDisplayName` already exists at the bottom of `generator.ts`; keep it. Remove the now-unused `findSubgroupName`/`activitySubgroups` import if nothing else uses them in this file.)

**Change B — `expandStudentSet` (keep the fallback scheduler correct):**
When a year/group has no subgroups, return the set's own id so occupancy tracking still works:
```ts
export function expandStudentSet(p: Project, id: string): string[] {
  for (const y of p.students) {
    if (y.id === id) {
      const subs = y.groups.flatMap((g) => g.subgroups.map((s) => s.id));
      return subs.length ? subs : [id];
    }
    for (const g of y.groups) {
      if (g.id === id) {
        return g.subgroups.length ? g.subgroups.map((s) => s.id) : [id];
      }
    }
  }
  return [id];
}
```

**Change C — `activityStudentCount` (count at the assigned level):**
Resolve each assigned id to its own `numberOfStudents` (year/group/subgroup), so capacity checks work without subgroups:
```ts
export function activityStudentCount(p: Project, a: Activity): number {
  let count = 0;
  for (const id of new Set(a.students)) {
    for (const y of p.students) {
      if (y.id === id) { count += y.numberOfStudents; break; }
      const g = y.groups.find((g) => g.id === id);
      if (g) { count += g.numberOfStudents; break; }
      const sg = y.groups.flatMap((g) => g.subgroups).find((s) => s.id === id);
      if (sg) { count += sg.numberOfStudents; break; }
    }
  }
  return count;
}
```
> Edge case to note in a code comment: if a user assigns both a Year and one of its subgroups, or a Year that mixes subgrouped and non-subgrouped groups, counts may be approximate. This is acceptable for the capacity *warning* it feeds.

**Acceptance:**
- Generating an activity assigned to a subgroup-less Year now emits `<Students>Year1</Students>`.
- The a.fet round-trip (Task 16) still places all activities.
- Verify with:
  ```bash
  bun -e '
  import { generateFetFile } from "./src/lib/fet/generator";
  import { newProject } from "./src/lib/fet/types";
  const p:any = newProject("t");
  p.institution={name:"T",comments:""}; p.days=[{name:"Mon"}]; p.hours=[{name:"08:00"}];
  p.subjects=[{id:"s1",name:"Math"}]; p.teachers=[{id:"t1",name:"T1"}];
  p.students=[{id:"y1",name:"Year1",numberOfStudents:30,groups:[]}];
  p.activities=[{id:1,teachers:["t1"],subject:"s1",activityTags:[],students:["y1"],duration:1,totalDuration:1,activityGroupId:0,isSplit:false,active:true,comments:""}];
  console.log((generateFetFile(p).match(/<Students>[^<]*<\/Students>/g)||["NONE"]).join());
  '
  ```
  Expect `<Students>Year1</Students>` (not `NONE`).

---

### Task 7 — Add a valid `version` attribute to the `<fet>` root (P2)
**File:** `src/lib/fet/generator.ts` (~line 15).

**Problem:** The generator emits `<fet name="...">` (no `version`). FET warns *"version numbering scheme which is not matched..."* and treats the file as **pre-v5 legacy**, running a format conversion.

**Change:**
```ts
lines.push(`<fet version="6.24.0">`);
```
(The institution name is already carried by `<Institution_Name>`; the `name` attribute is not part of FET's schema. Use a valid 3-number format version such as `6.24.0`, which FET forward-converts silently.)

**Acceptance:** Running the FET command in §0 on generated output no longer produces the "version numbering scheme" warning in `logs/warnings.txt`.

---

### Task 8 — `ActivityPreferredStartingTime` should not hard-lock at soft weights (P2)
**File:** `src/lib/fet/generator.ts` (~line 280).

**Problem:** `<Permanently_Locked>true</Permanently_Locked>` is hardcoded, turning a *preferred* start into an unmovable lock regardless of the user's weight.

**Change:** lock only when the constraint is compulsory:
```ts
lines.push(`\t\t<Permanently_Locked>${c.weight >= 100 ? "true" : "false"}</Permanently_Locked>`);
```

**Acceptance:** A preferred-start constraint at weight < 100 emits `Permanently_Locked=false`; at 100 emits `true`. FET still accepts the file (verify via §0 command).

---

## PHASE 3 — Robustness, validation, hygiene (Medium/Low)

### Task 9 — Validate write/import payloads with zod (P2)
**Files:** `src/app/api/projects/[id]/route.ts` (PUT), `src/app/api/projects/import/route.ts`, new `src/lib/fet/schema.ts`.

**Problem:** `PUT` and import accept arbitrary bodies with no schema validation. Malformed `project` JSON can corrupt a DB row and break `rowToProject` on later reads.

**Change:** Define a `zod` schema mirroring `Project` (in `src/lib/fet/schema.ts`), parse the incoming `project` in the PUT route, and return `400` with the zod error on failure. For import, validate the parsed result before `createProject`.

**Acceptance:** Sending `PUT /api/projects/:id` with a malformed body returns `400` (not a corrupted row). Valid saves still succeed. `bunx tsc --noEmit` passes.

---

### Task 10 — Stop double-storing timetable/status in the `data` JSON (P2)
**File:** `src/lib/fet/projectService.ts`.

**Problem:** `createProject`/`updateProject` serialize the whole project (including `timetable`, `status`, `name`, timestamps) into the `data` column, *and* also into their own columns. `setTimetable` updates only the columns, so `data.timetable` goes stale and the (potentially large) timetable is stored twice.

**Change:** Before `JSON.stringify`, strip the fields that have their own columns:
```ts
const { id: _id, timetable: _tt, status: _st, name: _n, createdAt: _c, updatedAt: _u, ...dataOnly } = project;
// store JSON.stringify(dataOnly) in `data`
```
Keep `rowToProject` reading `timetable`/`status`/`name` from the columns (already does). No schema migration needed.

**Acceptance:** Round-trip a project through create → setTimetable → get; the returned timetable matches the column value, and `data` no longer contains a `timetable` key.

---

### Task 11 — Fix the version tile precedence bug (P3)
**File:** `src/components/app/GeneratePage.tsx` (~line 205).

**Problem:** `value={result?.fetVersion ?? fetAvailable ? "detected" : "n/a"}` parses as `(result?.fetVersion ?? fetAvailable) ? "detected" : "n/a"`, so it never shows the actual version string.

**Change:**
```tsx
value={result?.fetVersion ?? (fetAvailable ? "detected" : "n/a")}
```

**Acceptance:** After a FET run, the Version tile shows `7.8.7`.

---

### Task 12 — Tighten `validateProject` student check (P3)
**File:** `src/lib/fet/validate.ts` (~lines 92–100).

**Problem:** The per-student existence check `activitySubgroups(p, a).length > 0 || ...` passes *any* id as long as the activity has any resolvable set (and recomputes `activitySubgroups` per id — O(n²)).

**Change:** Precompute a `Set` of all valid student-set ids (years + groups + subgroups) once, then check each `sid` against it directly. Emit an error naming the specific unknown id.

**Acceptance:** An activity referencing a genuinely unknown student id is flagged; valid ones are not; no O(n²) recompute.

---

### Task 13 — Clean up `importer.ts` (P3)
**File:** `src/lib/fet/importer.ts`.

**Problem:** Leftover AI "thinking" comments (~lines 739–750), an unnecessary `(ctx as any).tagNameToId` cast (the field exists on `SCtx`), and `parseSlots(inner)` called twice in the `ConstraintBreakTimes` branch (~line 522).

**Change:** Delete the stray comments; use `ctx.tagNameToId.get(tName)` directly; compute `parseSlots(inner)` once into a local and reuse.

**Acceptance:** Behavior unchanged; `bun run lint` clean; no `as any`.

---

### Task 14 — Repo hygiene (P3)
**Files:** `.gitignore`, working tree.

**Problem:** Large artifacts and one-off scripts clutter the tree: `test-out.fet` (~1.5MB), `test_out/`, `timetables/`, `dev.log`, `logs/`, `count-total.ts`, `extract-examples.ts`, `test-*.ts`. The `Post`/`User` Prisma models are unused starter-template leftovers.

**Change:** Ensure `.gitignore` covers `test_out/`, `timetables/`, `test-out.fet`, `*.log`, `logs/`. Move dev/test scripts into a `scripts/` folder (or delete the obsolete ones). Optionally remove the unused `Post`/`User` models from `prisma/schema.prisma` (only if nothing references them — grep first; requires `prisma generate`).

**Acceptance:** `git status` is clean of build/test artifacts; `bunx tsc --noEmit` and `bun run lint` pass.

---

### Task 15 — (Optional / larger) Async generation with status polling (P2)
**Files:** `src/app/api/projects/[id]/generate/route.ts`, client `api.ts`, `GeneratePage.tsx`.

**Problem:** Generation runs synchronously in the request (up to 120s), with no concurrency guard, and `status` sticks at `"generating"` if the process dies.

**Change (only if time allows):** Kick off generation in the background, return immediately, and let the client poll project `status`. Add a guard so a project already `"generating"` can't be started twice, and a timeout that resets a stale `"generating"` status. **Mark this task optional** — do not block Phases 1–2 on it.

---

## Task 16 — Regression harness: FET round-trip test (do this LAST, keep it)
**File:** new `scripts/verify-fet-roundtrip.ts`.

**Purpose:** catch generator/parser regressions automatically by exercising the real FET binary.

**Implementation:**
```ts
import { parseFetFile } from "../src/lib/fet/importer";
import { generateFetFile } from "../src/lib/fet/generator";
import { runGeneration } from "../src/lib/fet/runner";
import { readFileSync, existsSync } from "node:fs";

async function main() {
  const content = readFileSync("FET Example Files/a.fet", "utf8");
  const { project } = parseFetFile(content);

  // 1. Generated file must be valid FET XML (has version attr, students, etc.)
  const xml = generateFetFile(project);
  if (!/<fet version="/.test(xml)) throw new Error("generator missing <fet version>");

  // 2. Full pipeline via real FET (requires FET_BINARY_PATH or detected binary)
  const result = await runGeneration(project);
  console.log("engine:", result.usedEngine, "entries:", result.timetable.entries.length);
  if (result.usedEngine !== "fet")
    throw new Error("Expected FET engine; got " + result.usedEngine + " (set FET_BINARY_PATH)");
  if (result.timetable.entries.length === 0)
    throw new Error("No activities placed — parser/generator regression");
  console.log("ROUND-TRIP OK");
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
```

**Run:**
```bash
FET_BINARY_PATH='D:\Programs\fet\fet-7.8.7\fet-cl.exe' bun scripts/verify-fet-roundtrip.ts
```
**Acceptance:** Prints `engine: fet ... ROUND-TRIP OK` with a non-zero entry count.

---

## Suggested execution order & commit boundaries
1. Branch: `git checkout -b fix/audit-remediation`.
2. **Phase 1** (Tasks 1→5) — commit after Task 2 (`FET detection`) and again after Task 5.
3. **Phase 2** (Tasks 6→8) — commit after Task 6 (`student sets`) and after Task 8.
4. **Phase 3** (Tasks 9→14) — commit per task or in small groups.
5. Task 15 only if time allows.
6. Task 16 last; run it and paste the output in the final report.
7. After every task: `bunx tsc --noEmit && bun run lint`.

## Definition of done
- FET is detected and used by default on this machine; generation reports `engine: "fet"`.
- Activities assigned to subgroup-less Years/Groups carry their students.
- FET errors are shown to the user, not hidden behind a silent fallback.
- Generated files have a valid `<fet version>` and produce no FET version warning.
- `scripts/verify-fet-roundtrip.ts` prints `ROUND-TRIP OK`.
- `bunx tsc --noEmit` and `bun run lint` are clean.
