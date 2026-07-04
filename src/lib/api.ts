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

export async function generateTimetable(
  id: string,
  opts: { forceFallback?: boolean; binaryPath?: string } = {}
): Promise<GenerateResult> {
  const res = await fetch(`/api/projects/${id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err: Error & { issues?: ValidationIssue[] } = new Error(
      data?.error ?? `Generation failed (${res.status})`
    );
    if (data?.issues) err.issues = data.issues;
    throw err;
  }
  const data = await res.json();
  return data as GenerateResult;
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
