"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  deleteProject,
  fetchProjects,
  importFetFile,
} from "@/lib/api";
import type { Project } from "@/lib/fet/types";
import { projectStats } from "@/lib/fet/validate";
import {
  CalendarClock,
  Plus,
  Trash2,
  ArrowRight,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Users,
  DoorOpen,
  Layers,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await fetchProjects();
      setProjects(list);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const content = await file.text();
      const name = file.name.replace(/\.fet$/i, "");
      const result = await importFetFile(content, name);
      navigate(`/project/${result.project.id}`);
    } catch (e) {
      setImportError((e as Error).message);
      setImporting(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const name = newName.trim() || `Project ${new Date().toLocaleDateString()}`;
      const project = await createProject(name);
      navigate(`/project/${project.id}`);
    } finally {
      setCreating(false);
      setNewName("");
      setShowCreate(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    refresh();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-8 sm:p-12">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            University Timetable Generator
          </div>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Build conflict-free university timetables with FET
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Define your institution, teachers, subjects, rooms and constraints
            through a guided wizard. The backend generates a{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">.fet</code>{" "}
            file, runs the <strong>FET CLI</strong> engine, and returns a fully
            interactive timetable you can fine-tune by hand.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New timetable project
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-5 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import .fet file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".fet,.xml,application/xml,text/xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
            <a
              href="https://lalescu.ro/liviu/fet/doc/en/instructions.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-5 text-sm font-medium hover:bg-accent"
            >
              <BookOpen className="h-4 w-4" />
              Read the FET instructions
            </a>
          </div>
        </div>
      </section>

      {importError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Import failed</p>
            <p className="text-muted-foreground">{importError}</p>
          </div>
        </div>
      )}

      {/* Feature cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={<Users className="h-5 w-5" />}
          title="Teachers & subjects"
          desc="Add teachers, subjects, activity tags and split activities."
        />
        <FeatureCard
          icon={<Layers className="h-5 w-5" />}
          title="Year › Group › Subgroup"
          desc="Hierarchical student sets, just like FET expects."
        />
        <FeatureCard
          icon={<DoorOpen className="h-5 w-5" />}
          title="Rooms & buildings"
          desc="Capacity-aware room allocation with availability rules."
        />
        <FeatureCard
          icon={<CalendarClock className="h-5 w-5" />}
          title="Editable result"
          desc="Move activities between slots and re-verify conflicts instantly."
        />
      </section>

      {/* Projects */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your projects</h2>
          <button
            onClick={refresh}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => navigate(`/project/${p.id}`)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">New timetable project</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Give your project a name. You can change it later.
            </p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              placeholder="e.g. Fall 2025 — Engineering Dept."
              className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FileText className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create your first timetable project to get started with the wizard.
      </p>
      <button
        onClick={onCreate}
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Create project
      </button>
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const stats = projectStats(project);
  const updated = new Date(project.updatedAt);
  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onOpen} className="text-left">
          <h3 className="font-semibold leading-tight hover:underline">
            {project.name || "Untitled"}
          </h3>
          {project.institution.name && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.institution.name}
            </p>
          )}
        </button>
        <StatusPill status={project.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Stat label="Teachers" value={stats.teachers} />
        <Stat label="Subjects" value={stats.subjects} />
        <Stat label="Activities" value={stats.activities} />
        <Stat label="Rooms" value={stats.rooms} />
        <Stat label="Subgroups" value={stats.subgroups} />
        <Stat label="Days × Hours" value={`${stats.days}×${stats.hours}`} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {updated.toLocaleDateString()} {updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpen}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open <ArrowRight className="h-3 w-3" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &ldquo;{project.name || "Untitled"}&rdquo;
                  and its generated timetable. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5">
      <div className="text-sm font-semibold leading-none">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Project["status"] }) {
  const map: Record<Project["status"], { label: string; cls: string; icon: React.ReactNode }> = {
    draft: {
      label: "Draft",
      cls: "border-border bg-muted text-muted-foreground",
      icon: <FileText className="h-3 w-3" />,
    },
    ready: {
      label: "Ready",
      cls: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-300",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    generating: {
      label: "Generating",
      cls: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    generated: {
      label: "Generated",
      cls: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    error: {
      label: "Error",
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        s.cls
      )}
    >
      {s.icon}
      {s.label}
    </span>
  );
}
