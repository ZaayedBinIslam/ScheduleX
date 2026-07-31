# Migration Plan: Prisma + SQLite → Prisma + MongoDB

Migrate the ScheduleX database layer from SQLite (`db/custom.db`) to MongoDB while keeping every existing feature — project CRUD, timetable generation (FET + JS fallback), `.fet` import/export — working identically.

## Summary

The migration is straightforward because the data layer is minimal: **one Prisma model (`Project`) with no relations**, all DB access funneled through a single service file (`src/lib/fet/projectService.ts`), no raw SQL, and no transactions. The app already runs on **Prisma 6.19.2**, which is the exact version required for MongoDB (Prisma v7 does not yet support MongoDB). The core work is: swap the datasource in `schema.prisma`, add `@map("_id")` to the ID field, point `DATABASE_URL` to a MongoDB connection string, migrate existing rows via a one-shot script, and update the npm scripts that relied on `prisma migrate` (unsupported for MongoDB).

---

## Decisions Requiring Your Input

### 1. Dev/Prod MongoDB Hosting

**Options:**
- **(Recommended) MongoDB Atlas free tier** — zero local setup, already a replica set (required by Prisma for internal transactions), works from any machine, free M0 cluster is more than sufficient for a single-model app.
- **Local Docker** — works offline, but requires explicit replica-set initialization (single-node RS). Adds a `docker-compose.yml` and a startup ceremony. Good if you want full offline dev or already use Docker.

**Recommendation:** Atlas free tier for dev and prod. It eliminates the replica-set setup hassle entirely. A `docker-compose.yml` can be added later as an optional local alternative.

### 2. ID Strategy

**Options:**
- **(Recommended) Keep `@default(cuid())` + add `@map("_id")`** — existing CUID string IDs are stored as-is in MongoDB's `_id` field. Zero remapping of existing data. No `@db.ObjectId` needed (that attribute requires values to actually be BSON ObjectIds).
- **Switch to `@default(auto()) @map("_id") @db.ObjectId`** — more idiomatic MongoDB, but requires regenerating IDs for every existing row and updating any external references. Unnecessary complexity for no functional gain.

**Recommendation:** Keep CUIDs. The data migration script copies rows 1:1 with no ID transformation.

### 3. `data` / `timetable` Field Types

**Options:**
- **(Recommended) Keep as `String`** — the app already `JSON.stringify()`s on write and `JSON.parse()`s on read in `projectService.ts`. Zero code changes needed. MongoDB stores the string as-is.
- **Promote to Prisma `Json` type** — more idiomatic for a document DB, but introduces `JsonNull` vs `DbNull` handling for the nullable `timetable` field, and requires touching every `JSON.stringify()`/`JSON.parse()` call in `projectService.ts`. No functional benefit given how the app currently queries (it never filters/indexes on fields inside the JSON blob).

**Recommendation:** Keep `String`. Change the field type to `Json` only if you later want to query into the JSON structure directly.

---

## Phase 0 — Discovery/Verification Findings

These findings are based on reading every relevant file in the repo:

- [x] **Schema** (`prisma/schema.prisma`): Exactly one model `Project`, no relations, no enums. Fields: `id` (cuid), `name`, `data` (String), `timetable` (String?), `status` (default "draft"), `createdAt`, `updatedAt`. Index on `updatedAt`. ✅ matches assumptions.
- [x] **Prisma version**: `prisma@6.19.2` + `@prisma/client@6.19.2` installed. `package.json` specifies `^6.11.1`. ✅ Already on the correct version for MongoDB — **no version change needed**.
- [x] **DB client** (`src/lib/db.ts`): Standard Next.js Prisma singleton. Exports `db`. No raw queries.
- [x] **All DB operations** (`src/lib/fet/projectService.ts`): 6 functions — `listProjects`, `getProject`, `createProject`, `updateProject`, `deleteProject`, `setTimetable`. All use standard Prisma Client methods (`findMany`, `findUnique`, `create`, `update`, `delete`). **No `$queryRaw`, `$executeRaw`, or `$transaction` anywhere in `src/`.**
- [x] **API routes**: All route handlers delegate to `projectService.ts` — no direct Prisma usage in route files.
- [x] **package.json scripts**: `db:push`, `db:generate`, `db:migrate` (`prisma migrate dev`), `db:reset` (`prisma migrate reset`). The `db:migrate` and `db:reset` scripts **will break** — MongoDB doesn't support `prisma migrate`.
- [x] **`.env`**: `DATABASE_URL=file:../db/custom.db`. No `.env.example` exists.
- [x] **Seed file** (`seed.ts`): Seeds via HTTP API (`fetch`), not via Prisma directly. **No changes needed.**
- [x] **No Docker/Caddyfile config** in the repo.
- [x] **SQLite DB file**: `db/custom.db` (889 KB). Already gitignored via `/db/*.db`.
- [x] **No other files import from `@/lib/db`** — all DB access is channeled through `projectService.ts`.

---

## Phase 1 — MongoDB Environment Setup

- [ ] **Create a MongoDB Atlas free cluster** (or set up local Docker replica set, per decision #1)
  - Atlas: Create M0 free cluster → create DB user → whitelist IP (or `0.0.0.0/0` for dev) → copy connection string
  - Connection string format: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority`
- [ ] **Update `.env`**:
  ```diff
  - DATABASE_URL=file:../db/custom.db
  + DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/schedulex?retryWrites=true&w=majority"
  ```
- [ ] **Create `.env.example`** with a placeholder MongoDB URL for documentation

> **Note — Replica set requirement**: Prisma uses MongoDB transactions internally (even for simple nested writes). A standalone `mongod` without replica-set config will fail. Atlas clusters are replica sets by default. For local Docker, you'd need `mongod --replSet rs0` plus `rs.initiate()`.

---

## Phase 2 — Prisma Schema Conversion

- [ ] **Modify `prisma/schema.prisma`**:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "mongodb"
   url      = env("DATABASE_URL")
 }

 model Project {
-  id        String   @id @default(cuid())
+  id        String   @id @default(cuid()) @map("_id")
   name      String
   data      String
   timetable String?
   status    String   @default("draft")
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt

   @@index([updatedAt])
 }
```

**Changes:**
1. `provider = "sqlite"` → `provider = "mongodb"`
2. Add `@map("_id")` to the `id` field

**Not changed:** `@default(cuid())`, field types, `@@index`, Prisma version.

> **Warning:** Do NOT add `@db.ObjectId` to the `id` field — CUIDs are not valid BSON ObjectIds.

- [ ] **Run `prisma generate`**
- [ ] **Run `prisma db push`** to create the `Project` collection + index

---

## Phase 3 — Data Migration Script

- [ ] **Create `scripts/migrate-sqlite-to-mongo.ts`** — a one-shot Bun script that:
  1. Opens the old SQLite DB via `bun:sqlite`
  2. Reads all rows from the `Project` table
  3. Inserts each row into MongoDB via the new Prisma client, preserving all fields exactly (including `createdAt`/`updatedAt` timestamps)
  4. Verifies: row count matches, spot-checks random rows
  5. Prints a summary

- [ ] **Keep `db/custom.db` untouched** as a backup
- [ ] **Run the migration script** and verify output

> **Risk — timestamps**: The migration script must explicitly set `createdAt`/`updatedAt` from the SQLite values, not let Prisma auto-generate them. SQLite stores DateTimes as ISO-8601 strings.

---

## Phase 4 — Tooling Updates

- [ ] **Update `package.json` scripts**:
  ```diff
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
  - "db:migrate": "prisma migrate dev",
  - "db:reset": "prisma migrate reset"
  + "db:reset": "bun run scripts/db-reset.ts"
  ```

- [ ] **Create `scripts/db-reset.ts`** — drops the `Project` collection, re-runs `prisma db push`

- [ ] **Pin Prisma version** to `~6.19.2` in `package.json` to prevent accidental v7 upgrade (which doesn't support MongoDB)

- [ ] **Update `.gitignore` comments** (SQLite → MongoDB)

---

## Phase 5 — Application Code Review

- [ ] Confirm no raw SQL anywhere ✅
- [ ] Confirm no SQLite-specific assumptions ✅
- [ ] Confirm `db.ts` needs no changes ✅
- [ ] Confirm `seed.ts` needs no changes ✅
- [ ] Update comment in `schema.prisma` (remove "SQLite" reference)
- [ ] Confirm `scripts/verify-fet-roundtrip.ts` has no DB access ✅

---

## Phase 6 — Full Functional Test Pass

All routes must work end-to-end:

- [ ] `GET /api/projects` — returns migrated projects
- [ ] `POST /api/projects` — creates new project
- [ ] `GET /api/projects/[id]` — returns specific project with intact JSON
- [ ] `PUT /api/projects/[id]` — updates project
- [ ] `DELETE /api/projects/[id]` — deletes project
- [ ] `POST /api/projects/[id]/generate` — generates timetable (FET + fallback)
- [ ] `GET /api/projects/[id]/export` — exports `.fet` file
- [ ] `POST /api/projects/import` — imports `.fet` file
- [ ] `GET /api/fet-status` — FET detection (no DB)
- [ ] Seed script completes successfully
- [ ] Spot-check data integrity vs old SQLite

---

## Phase 7 — Cutover Plan & Rollback Path

### Cutover
1. Merge the migration branch
2. Update production `.env` with MongoDB connection string
3. Run `prisma db push` against production
4. Run `scripts/migrate-sqlite-to-mongo.ts` to copy data
5. Deploy and smoke test

### Rollback
1. Revert `schema.prisma`: `provider` → `"sqlite"`, remove `@map("_id")`
2. Revert `.env`: `DATABASE_URL` → `file:../db/custom.db`
3. Revert `package.json` scripts
4. Run `prisma generate`
5. The old `db/custom.db` is untouched — instant rollback

### Post-Migration Cleanup (after confidence)
- Delete `db/custom.db` and `db/` directory
- Remove `scripts/migrate-sqlite-to-mongo.ts`
- Update `README.md` for MongoDB setup
- Remove SQLite gitignore entries

---

## Risk Notes

| Risk | Severity | Mitigation |
|------|----------|------------|
| Prisma v7 drops v6 MongoDB support before v7 adds it | Low | Pin `~6.19.2`, add comment |
| Atlas free-tier slow for large JSON | Low | Blobs are 10-100 KB, well within M0 limits |
| `createdAt`/`updatedAt` drift during migration | Medium | Script explicitly sets both from SQLite values |
| Transactions fail on non-replica-set Mongo | High | Atlas = automatic RS; Docker needs `--replSet` + `rs.initiate()` |
| Accidental `prisma@latest` installs v7 | Medium | Pin `~6.19.2` in `package.json` |
