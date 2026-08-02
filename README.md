<div align="center">

<img src="public/logo.svg" width="72" height="72" alt="ScheduleX logo">

# ScheduleX

**A university timetable generator powered by [FET (Free Timetabling Software)](https://lalescu.ro/liviu/fet/).**

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-New_York-000000?logo=shadcnui&logoColor=white)](https://ui.shadcn.com)
[![Bun](https://img.shields.io/badge/Bun-1.3+-FBF0DF?logo=bun&logoColor=000)](https://bun.sh)
[![Prisma](https://img.shields.io/badge/Prisma-MongoDB-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![FET](https://img.shields.io/badge/engine-FET_7.x-4B8BBE)](https://lalescu.ro/liviu/fet/)

</div>

---

Define your teachers, subjects, rooms, student sets and constraints through a guided wizard, hand the problem to the FET solver, then fine-tune the result by hand with drag-and-drop. Everything runs locally — ScheduleX writes a `.fet` file, runs FET's command-line solver on it, and parses the finished timetable back into an editable grid.

---

## Prerequisites

| Requirement | Notes |
| --- | --- |
| [Bun](https://bun.sh) ≥ 1.3 | Package manager and runtime |
| [FET](https://lalescu.ro/liviu/fet/) ≥ 7.x | The timetabling engine (`fet-cl`) |

---

## 1. Install FET

FET is a separate program and is **not** bundled with this repo. Download it from the official source only:

- Homepage: <https://lalescu.ro/liviu/fet/>
- Downloads: <https://lalescu.ro/liviu/fet/download.html>

Install it wherever you like — e.g. `C:\Program Files\FET` on Windows, or your distribution's package (`apt install fet`, `pacman -S fet`, …) on Linux.

## 2. Put FET on your system PATH

After installing, add the folder that contains **`fet-cl.exe`** (Windows) or **`fet-cl`** (Linux/macOS) to your system `PATH`.

### Why this is necessary

ScheduleX never opens the FET desktop window. It shells out to FET's **command-line** binary, `fet-cl`, passing it a generated `.fet` input file and a time limit, then reads the XML timetable FET writes out. For that spawn to succeed, the OS has to be able to resolve the bare name `fet-cl` — which is exactly what `PATH` is for. Without it the spawn fails, the app reports **"FET not detected"**, and generation falls back to a built-in greedy scheduler that is much weaker than the real solver.

**Windows**

1. Settings → *Edit the system environment variables* → **Environment Variables…**
2. Under *User variables*, select `Path` → **Edit** → **New**
3. Paste the FET install folder, e.g. `C:\Program Files\FET\fet-7.8.7`
4. **Restart your terminal** (and your editor) — `PATH` is only read at process start.

**Linux / macOS**

```bash
echo 'export PATH="$PATH:/opt/fet"' >> ~/.bashrc && source ~/.bashrc
```

### Verify

```bash
fet-cl --version
```

If that prints a FET version, the backend is ready. ScheduleX re-runs the same check at [`/api/fet-status`](src/app/api/fet-status/route.ts) and shows the detected version in the UI.

### Alternative: skip PATH, point at the binary directly

If you'd rather not touch `PATH`, set `FET_BINARY_PATH` in `.env` to the full path of the executable:

```env
FET_BINARY_PATH=C:\Program Files\FET\fet-7.8.7\fet-cl.exe
```

The app also probes a few common install locations (`C:\Program Files\FET`, `/usr/bin`, `/opt/fet`, …) as a last resort, but `PATH` or `FET_BINARY_PATH` is the supported setup.

---

## 3. Provision a MongoDB database

ScheduleX stores projects in MongoDB. Prisma uses transactions internally, so the server **must be a replica set** — a standalone `mongod` will fail at runtime.

- **MongoDB Atlas (recommended).** The free M0 tier is a replica set out of the box and needs no local setup. Create a cluster, add a database user, allow your IP under Network Access, then copy the connection string.
- **Local Docker.** Start `mongod --replSet rs0` and run `rs.initiate()` once to promote it to a single-node replica set.

## 4. Configure the environment

Copy [`.env.example`](.env.example) to `.env` and fill in your connection string:

```bash
cp .env.example .env
```

```env
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/schedulex?retryWrites=true&w=majority"
NEXTAUTH_SECRET="<a random string>"
NEXTAUTH_URL="http://localhost:3000"
# Optional — only if FET is not on your PATH
# FET_BINARY_PATH=C:\Program Files\FET\fet-7.8.7\fet-cl.exe
```

The database name goes in the path segment (`/schedulex` above). `.env` is gitignored — keep credentials out of commits.

`NEXTAUTH_SECRET` signs the session token and is **required**. Its absence fails in a confusing way rather than loudly: sign-in appears to succeed in the browser while every API call fails to decrypt the token and returns 401, and a production build refuses to start at all. Generate one with:

```bash
openssl rand -base64 32
```

Changing the secret later invalidates existing sessions, so everyone is signed out once. `NEXTAUTH_URL` must match how you actually reach the app, including scheme and port — it is what callback URLs are built from.

## 5. Install dependencies and set up the database

```bash
bun install
```

```bash
bun run db:push
```

`db:push` syncs the Prisma schema to MongoDB, creating the indexes for the `Project` collection and for the `User` / `Account` / `Session` collections that authentication uses. Run it once on a fresh clone, and again whenever `prisma/schema.prisma` changes. MongoDB has no migration files — `prisma migrate` is not supported, so `db:push` is the only schema command.

## 6. Run the dev server

```bash
bun run dev
```

Open <http://localhost:3000>.

## 7. Create an account

ScheduleX requires a sign-in. On first run you land on `/login` with no account yet — follow **Create one now** to `/register` and make one (passwords are a minimum of 8 characters).

Projects are private to the account that created them: the dashboard lists only your own, and every project route is scoped by owner, so someone else's project id returns 404 rather than their data. Projects created before authentication existed have no owner and are visible to nobody — they are still in the database, and can be claimed by setting their `userId`.

---

## Production build & preview

Build the app, then run the compiled output locally to preview exactly what ships:

```bash
bun run build
```

```bash
bun run start
```

`build` produces a Next.js **standalone** bundle in `.next/standalone` (with `static/` and `public/` copied in), and `start` serves it on port 3000 with `NODE_ENV=production`. Server output is mirrored to `server.log`.

Previewing the production build before deploying is worth the extra step: the dev server and the production build differ in caching, bundling and React behaviour, so a bug can easily exist in only one of them. Note that FET must be on `PATH` for the production process too — it is resolved at runtime, not at build time.

---

## All commands

| Command | What it does |
| --- | --- |
| `bun install` | Install dependencies |
| `bun run dev` | Dev server with hot reload on :3000 |
| `bun run build` | Production standalone build |
| `bun run start` | Serve the production build on :3000 |
| `bun run lint` | ESLint over the project |
| `bun run db:push` | Sync the Prisma schema to MongoDB (no migration files) |
| `bun run db:generate` | Regenerate the Prisma client |
| `bun run db:reset` | Drop the whole database and re-push the schema ⚠️ destroys all data, asks to confirm |

---

## Project layout

```
src/app/api/          Route handlers — projects CRUD, import/export, generate, fet-status,
                      auth (NextAuth handler + registration)
src/lib/auth.ts       NextAuth options, credentials provider, session helper
src/lib/fet/          The FET integration
  generator.ts          Project model  ->  .fet XML input file
  runner.ts             Binary detection + spawning fet-cl, watchdog, timeouts
  parser.ts             FET's activities.xml  ->  Timetable
  scheduler.ts          Greedy fallback used when FET is unavailable
  constraintCatalog.ts  Every constraint type the UI can add
  importer.ts           Read an existing .fet file into a project
src/components/       UI (shadcn/ui + Tailwind)
src/lib/store.ts      Zustand app state
prisma/schema.prisma  Project storage and the NextAuth user/session models (MongoDB)
scripts/              verify-fet-roundtrip.ts — end-to-end generate/parse check
                      migrate-sqlite-to-mongo.ts — one-shot import from the old SQLite DB
                      db-reset.ts — drop the database and re-push the schema
docs/plans/           Archived implementation specs, named by the commit that shipped them
```

---

## Troubleshooting

**"FET not detected" / results look poor.** `fet-cl` isn't resolvable. Run `fet-cl --version` in a *new* terminal; if it fails, revisit [step 2](#2-put-fet-on-your-system-path). Without it the app falls back to the built-in greedy scheduler, which respects hard clashes but does not optimise.

**Generation times out.** The solver runs with a time budget (default 300s) and is stopped by a watchdog after that plus a grace period. Hard-to-satisfy constraint sets need a longer budget — raise it in the generate dialog.

**Prisma errors on startup.** You probably skipped `bun run db:push`, or `DATABASE_URL` points somewhere that doesn't exist. If the error mentions transactions or replica sets, your MongoDB server is a standalone `mongod` — see [step 3](#3-provision-a-mongodb-database).

**Sign-in "works" but the app stays empty and the console logs 401s.** `NEXTAUTH_SECRET` is missing or was changed. The server log shows `[next-auth][warn][NO_SECRET]` or `JWT_SESSION_ERROR: decryption operation failed`. Set it in `.env` (see [step 4](#4-configure-the-environment)), restart the dev server, then clear the stale session cookie for `localhost:3000` and sign in again.

**Your projects disappeared after adding authentication.** Projects are scoped to their owner, and any created before sign-in existed have no `userId`, so nothing lists them. The documents are intact — set `userId` on them to the account that should own them.

**Connection timeouts against Atlas.** Your current IP probably isn't allowed. Add it under Network Access in the Atlas console.

---

## Credits

ScheduleX is a front-end and workflow layer. **All the actual timetabling is done by FET.**

> ### FET — Free Timetabling Software
> Copyright © **Liviu Lalescu** — <https://lalescu.ro/liviu/fet/>
> Co-author and long-time contributor: **Volker Dirr**
> Licensed under the GNU Affero General Public License v3 (AGPLv3).

FET is an outstanding piece of free software and the entire generation engine here. If you use ScheduleX, please credit FET and consider supporting its authors. FET is distributed separately under its own license — nothing in this repository redistributes or modifies it.

Also built on [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), [Prisma](https://www.prisma.io) and [Bun](https://bun.sh).
