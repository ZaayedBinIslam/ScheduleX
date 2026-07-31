import type {
  Project,
  Timetable,
  ValidationIssue,
} from "@/lib/fet/types";

// Thin API client around fetch for the Next.js API routes.

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch("/api/projects", { cache: "no-store" });
  const data = await json<{ projects: Project[] }>(res);
  return data.projects;
}

export async function createProject(name: string): Promise<Project> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await json<{ project: Project }>(res);
  return data.project;
}

export async function fetchProject(id: string): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
  const data = await json<{ project: Project }>(res);
  return data.project;
}

export async function saveProject(
  project: Project
): Promise<Project> {
  const res = await fetch(`/api/projects/${project.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  });
  const data = await json<{ project: Project }>(res);
  return data.project;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  await json<{ ok: boolean }>(res);
}

export interface GenerateResult {
  project: Project;
  engine: "fet" | "fallback";
  fetVersion?: string;
  warnings: string[];
  log: string;
  issues: ValidationIssue[];
}

/**
 * Rejection from {@link generateTimetable} when the run was stopped on purpose.
 * Callers should return the UI to its idle state rather than report a failure.
 */
export class GenerationCancelledError extends Error {
  constructor(message = "Generation was stopped.") {
    super(message);
    this.name = "GenerationCancelledError";
  }
}

export async function generateTimetable(
  id: string,
  opts: {
    forceFallback?: boolean;
    binaryPath?: string;
    timeoutSeconds?: number;
    /** Aborting this drops the request and stops the run server-side. */
    signal?: AbortSignal;
  } = {}
): Promise<GenerateResult> {
  const { signal, ...payload } = opts;
  let res: Response;
  try {
    res = await fetch(`/api/projects/${id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (e) {
    // Aborting the request is how the stop button guarantees a result: the
    // server sees req.signal fire and kills the solver, and this rejects at
    // once instead of waiting on a response that is no longer coming.
    if (signal?.aborted || (e as Error)?.name === "AbortError") {
      throw new GenerationCancelledError();
    }
    throw e;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if ((data as { cancelled?: boolean })?.cancelled) {
      throw new GenerationCancelledError(
        (data as { error?: string })?.error || undefined
      );
    }
    const err: Error & { issues?: ValidationIssue[] } = new Error(
      data?.error ?? `Generation failed (${res.status})`
    );
    if (data?.issues) err.issues = data.issues;
    throw err;
  }
  const data = await res.json();
  return data as GenerateResult;
}

/**
 * Ask the server to stop the run in progress for a project. Resolves to false
 * when the server had no record of a run — either it had already finished, or
 * the registry lost it across a dev reload.
 *
 * Best effort, and not the only line of defence: the caller also aborts the
 * generation request itself, which stops the solver through the live handler
 * rather than through shared server state.
 */
export async function stopGeneration(id: string): Promise<boolean> {
  const res = await fetch(`/api/projects/${id}/generate`, { method: "DELETE" });
  const data = await json<{ stopped: boolean }>(res);
  return data.stopped;
}

export async function fetchFetStatus(): Promise<{
  available: boolean;
  path: string | null;
  version: string | null;
}> {
  const res = await fetch("/api/fet-status", { cache: "no-store" });
  return json(res);
}

// Save an edited timetable back to the server (re-uses PUT with full project).
export async function saveTimetable(
  project: Project,
  timetable: Timetable
): Promise<Project> {
  return saveProject({ ...project, timetable, status: "generated" });
}

// --- Import / Export .fet files ---

// Trigger a .fet file download for a project.
export function exportProjectUrl(id: string): string {
  return `/api/projects/${id}/export`;
}

export interface ImportResult {
  project: Project;
  warnings: string[];
  stats: {
    days: number;
    hours: number;
    teachers: number;
    subjects: number;
    activityTags: number;
    years: number;
    subgroups: number;
    activities: number;
    rooms: number;
    timeConstraints: number;
    spaceConstraints: number;
    skippedConstraints: number;
  };
}

// Import a .fet file's text content and create a new project.
export async function importFetFile(
  content: string,
  name?: string
): Promise<ImportResult> {
  const res = await fetch("/api/projects/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? `Import failed (${res.status})`);
  }
  return data as ImportResult;
}
