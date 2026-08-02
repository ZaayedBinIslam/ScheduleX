# Implementation plans (archive)

Historical specs that were written before a change and executed by an agent. They are kept for context on *why* a change looks the way it does — they are **not** current documentation, and nothing here is a to-do list.

Each file is named `<commit>-<topic>.md`, where `<commit>` is the commit that implemented it.

| Plan | Implemented in | Added in |
| --- | --- | --- |
| [f322c5f-fet-audit-remediation.md](f322c5f-fet-audit-remediation.md) — 16-task remediation spec: FET binary detection, spawn quoting, output discovery, student-set emission, zod validation, storage de-duplication, round-trip harness | `f322c5f` *fix(fet): remediate audit issues across binary detection, student emission, validation, and storage* | `14c74ed` |
| [630e0fc-generation-live-timer.md](630e0fc-generation-live-timer.md) — live elapsed timer during generation, `durationMs` on `Timetable` | `630e0fc` *feat(generate): add live elapsed timer and configurable solver timeout* | `630e0fc` |
| [630e0fc-generation-timeout-option.md](630e0fc-generation-timeout-option.md) — user-configurable solver time budget, default raised 120s → 300s | `630e0fc` *feat(generate): add live elapsed timer and configurable solver timeout* | `630e0fc` |
| [608d91a-authentication.md](608d91a-authentication.md) — NextAuth credentials sign-in, registration, NextAuth Prisma models, API route protection | `608d91a` *Add modern authentication setup and ui/uz* | `608d91a` |

The timeout plan was refined further in `d092238` *fix(fet): honour the user's time budget instead of a fixed 2 minutes*.

The authentication plan describes the sign-in work only. It shipped without authorization — projects stayed unscoped, so any signed-in user could read and delete everyone else's — and the registration route returned the password hash. Both were fixed in `fdb81b5` *Scope projects to their owner and harden the auth endpoints*, which also added the server-side validation the plan called for but did not implement.
