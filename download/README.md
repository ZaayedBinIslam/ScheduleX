# UniTimetable — Source Download

This folder contains the full source code of the **UniTimetable** app — a
fullstack University Timetable Generator that uses the **FET CLI** engine.

## Files

| File | Size | Description |
|------|------|-------------|
| `unitimetable-source.zip` | ~232 KB | Source code (Windows-friendly zip) |
| `unitimetable-source.tar.gz` | ~183 KB | Source code (gzip tarball) |

Both archives contain the **same files**. Pick whichever you prefer.

## What's inside

```
src/
├── app/
│   ├── page.tsx              # Entry — loads the HashRouter SPA (client-only)
│   ├── layout.tsx            # Root layout + metadata
│   ├── globals.css           # Tailwind v4 theme
│   └── api/
│       ├── projects/         # CRUD: GET/POST, GET/PUT/DELETE [id]
│       ├── projects/[id]/generate/   # Runs fet-cli (or fallback)
│       └── fet-status/       # Detects the fet binary on the server
├── components/
│   ├── app/                  # App, Layout, Dashboard, GeneratePage, ProjectWorkspace
│   ├── wizard/               # 9 setup steps + MultiSelect + TimeSlotGrid
│   └── timetable/            # TimetablePage (matrix view + edit dialog)
└── lib/
    ├── fet/
    │   ├── types.ts          # Full FET data model
    │   ├── generator.ts      # Generates the .fet XML file
    │   ├── parser.ts         # Parses fet-cli output (activities.xml)
    │   ├── scheduler.ts      # Internal fallback scheduler
    │   ├── runner.ts         # Orchestrates fet-cli + fallback
    │   ├── validate.ts       # Project validation
    │   ├── resolve.ts        # Name/id resolution helpers
    │   ├── projectService.ts # Prisma persistence
    │   └── timetable-utils.ts# Matrix building + conflict detection
    ├── api.ts                # Typed API client
    ├── store.ts              # Zustand store (project state + CRUD)
    ├── db.ts                 # Prisma client
    └── utils.ts
prisma/
└── schema.prisma             # Project model (data + timetable JSON columns)
public/                       # Static assets
package.json, tsconfig.json, next.config.ts, tailwind.config.ts, ...
```

## How to run locally

1. **Unzip** the archive:
   ```bash
   unzip unitimetable-source.zip -d unitimetable
   cd unitimetable
   ```
2. **Install dependencies** (Node 18+ or Bun):
   ```bash
   bun install   # or: npm install
   ```
3. **Set up the database** (SQLite, auto-created):
   ```bash
   cp .env.example .env   # if present, else DATABASE_URL is already set
   bun run db:push
   ```
4. **(Optional) Install FET CLI** — the app auto-detects `fet` / `fet-cli` on
   your PATH. Download it from https://lalescu.ro/liviu/fet/ . If it's not
   found, the app falls back to a built-in scheduler so you can still try it.
5. **Start the dev server**:
   ```bash
   bun run dev    # or: npm run dev
   ```
   Then open http://localhost:3000

## Tech stack

- **Next.js 16** (App Router) + **TypeScript 5**
- **React 19** + **React Router 7** (HashRouter, client-side SPA on `/`)
- **Tailwind CSS 4** + **shadcn/ui** (New York style)
- **Prisma ORM** (SQLite)
- **Zustand** for client state
- **FET CLI** as the timetable engine (https://lalescu.ro/liviu/fet/)

## How the FET integration works

1. You fill in institution / days / hours / teachers / subjects / students /
   activities / rooms / constraints through the 9-step wizard.
2. When you click **Generate**, the backend (`src/lib/fet/generator.ts`)
   serializes the project into a `.fet` XML file (FET's native input format).
3. `src/lib/fet/runner.ts` spawns `fet-cli --inputfile=... --outputdir=...`.
4. `src/lib/fet/parser.ts` reads the `activities.xml` produced by FET and
   converts it back into structured timetable entries.
5. The frontend shows an interactive days×hours matrix you can edit by
   clicking any activity (with live conflict detection).

If `fet` isn't installed, `src/lib/fet/scheduler.ts` runs a greedy in-process
scheduler so the app is always usable for demos.

## References

- Features: https://lalescu.ro/liviu/fet/features.html
- Instructions: https://lalescu.ro/liviu/fet/doc/en/instructions.html
- Tips: https://lalescu.ro/liviu/fet/doc/en/tips.html
- FAQ: https://lalescu.ro/liviu/fet/doc/en/faq.html
