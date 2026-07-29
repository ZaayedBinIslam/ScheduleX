# Generation Timeout Option Plan (`generation-timeout-option.md`)

## Overview
Allow users to configure the timetable generation timeout in minutes on the `GeneratePage` UI so that long solver runs on complex timetables do not time out prematurely.

## Success Criteria
- [ ] User can specify generation timeout in minutes on `GeneratePage.tsx`.
- [ ] Default timeout increased from 2 minutes (120s) to 5 minutes (300s).
- [ ] Backend API `/api/projects/[id]/generate` receives and enforces `timeoutSeconds`.
- [ ] TypeScript types (`npx tsc --noEmit`) and production build (`npm run build`) pass cleanly.

## Task Breakdown

### Task 1: API & Client Layer Options
- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Files**:
  - `src/app/api/projects/[id]/generate/route.ts`
  - `src/lib/api.ts`
- **Input**: Request payload
- **Output**: Parse `timeoutSeconds` and pass to `runGeneration`
- **Verify**: `npx tsc --noEmit`

### Task 2: UI Input Field for Timeout
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`
- **Files**:
  - `src/components/app/GeneratePage.tsx`
- **Input**: User state `timeoutMinutes`
- **Output**: Configurable number input in Options panel (`1` to `120` minutes)
- **Verify**: Manual check on `/project/:id/generate`

## Phase X: Verification
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
