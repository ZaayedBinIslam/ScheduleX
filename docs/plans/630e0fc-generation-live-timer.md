# Timetable Generation Live Timer & FET Estimation Plan

## Overview
Add a live elapsed timer to the timetable generation page (`GeneratePage.tsx`), track actual execution duration in `Timetable` metadata, and handle FET time estimation capabilities.

## Success Criteria
- [ ] Live elapsed timer counts seconds while timetable generation is in progress (`generating` phase).
- [ ] Timer stops cleanly on completion (`done`) or failure (`error`).
- [ ] Total generation duration (`durationMs`) is stored on the generated `Timetable` object.
- [ ] Display historical/estimated benchmark based on prior generation duration when available.
- [ ] All TypeScript types, Zod schemas, and build checks pass without warnings or errors.

## Tech Stack
- Frontend: React (Vite / Next.js app), Lucide Icons (`Timer`, `Clock`), Tailwind CSS
- Backend/Engine: Node.js `child_process`, FET CLI (`fet-cl`), Zod validation

## Task Breakdown

### Task 1: Extend Timetable Type & Zod Schema
- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Files**:
  - `src/lib/fet/types.ts`
  - `src/lib/fet/schema.ts`
- **Input**: Current `Timetable` interface
- **Output**: `Timetable` updated with `durationMs?: number`
- **Verify**: `npx tsc --noEmit`

### Task 2: Record Execution Duration in Runner
- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Files**:
  - `src/lib/fet/runner.ts`
- **Input**: `runGeneration` function
- **Output**: Measure elapsed time `Date.now() - startTime` and attach to `result.timetable.durationMs`
- **Verify**: Run test generation API endpoint

### Task 3: Implement Live Timer & Duration Tile in UI
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`
- **Files**:
  - `src/components/app/GeneratePage.tsx`
- **Input**: Generation page state
- **Output**: Live ticking timer (`MM:SS`) during generation, final duration display on completion, estimated duration badge before starting
- **Verify**: Visual check on `/project/:id/generate`

## Phase X: Verification
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
