/**
 * Tracks generation runs that are currently in flight so a second request can
 * stop them.
 *
 * A generation is one long POST that blocks inside the FET child process, so the
 * request that started it cannot also cancel it. The stop button therefore sends
 * a separate DELETE, which looks the run up here and aborts its controller.
 *
 * The map is parked on globalThis, the same trick src/lib/db.ts uses for the
 * Prisma client. A plain module-level Map is not enough: in dev, editing any
 * file in the route's module graph re-evaluates this module, and the fresh Map
 * no longer holds the controller for the run already in flight. The DELETE then
 * reports that nothing was running while the solver kept going — which left the
 * stop button spinning forever.
 *
 * This is still per-process state. Behind several instances a stop request can
 * land on a node that is not running the solver, so the client aborts its own
 * request as well and never relies on this registry alone.
 */
const globalForRuns = globalThis as unknown as {
  fetRuns: Map<string, AbortController> | undefined;
};

const runs: Map<string, AbortController> = (globalForRuns.fetRuns ??= new Map());

/** Register a starting run and return the controller that cancels it. */
export function registerRun(projectId: string): AbortController {
  const controller = new AbortController();
  runs.set(projectId, controller);
  return controller;
}

/**
 * Forget a finished run. The controller is passed so a run that has already been
 * replaced by a newer one for the same project does not clear its successor.
 */
export function clearRun(projectId: string, controller: AbortController): void {
  if (runs.get(projectId) === controller) {
    runs.delete(projectId);
  }
}

/** Abort the run for a project. Returns false when nothing was running. */
export function cancelRun(projectId: string): boolean {
  const controller = runs.get(projectId);
  if (!controller) return false;
  controller.abort();
  runs.delete(projectId);
  return true;
}
