"use client";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useProjectStore } from "@/lib/store";
import {
  CalendarClock,
  Github,
  Home,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dirty = useProjectStore((s) => s.dirty);
  const saving = useProjectStore((s) => s.saving);
  const save = useProjectStore((s) => s.save);
  const project = useProjectStore((s) => s.project);
  const fetAvailable = useProjectStore((s) => s.fetAvailable);
  const error = useProjectStore((s) => s.error);

  // Save with Cmd/Ctrl+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && project && !saving) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, project, saving, save]);

  // Autosave shortly after the user stops editing. Every wizard field writes
  // straight to the store, so without this a closed tab loses the work.
  useEffect(() => {
    if (!dirty || !project || saving) return;
    const t = setTimeout(() => save(), 1200);
    return () => clearTimeout(t);
  }, [dirty, project, saving, save]);

  // Backstop for the gap between the last edit and the autosave landing.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const inProject = location.pathname.startsWith("/project/");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarClock className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">UniTimetable</span>
          </Link>

          {inProject && project && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="truncate font-medium max-w-[40vw]">
                {project.name || "Untitled"}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {saving ? "saving…" : dirty ? "unsaved" : "saved"}
              </span>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <FetBadge available={fetAvailable} />
            {inProject && (
              <button
                onClick={() => {
                  if (dirty && project && !saving) save();
                }}
                disabled={!dirty || saving}
                title={
                  dirty
                    ? "Save now (⌘/Ctrl+S) — changes also save automatically"
                    : "All changes saved"
                }
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                  dirty
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : dirty ? (
                  <Save className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {saving ? "Saving" : dirty ? "Save" : "Saved"}
              </button>
            )}
            <Link
              to="/"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>
        </div>
        {error && (
          <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs text-destructive">
            {error}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-auto border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>
              UniTimetable — powered by{" "}
              <a
                href="https://lalescu.ro/liviu/fet/"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline-offset-2 hover:underline"
              >
                FET (Free Timetabling Software)
              </a>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://lalescu.ro/liviu/fet/doc/en/instructions.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              Instructions
            </a>
            <a
              href="https://lalescu.ro/liviu/fet/doc/en/tips.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              Tips
            </a>
            <a
              href="https://lalescu.ro/liviu/fet/doc/en/faq.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              FAQ
            </a>
            <span className="inline-flex items-center gap-1">
              <Github className="h-3 w-3" /> React · React Router · Tailwind v4
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FetBadge({ available }: { available: boolean | null }) {
  if (available === null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        available
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
      )}
      title={
        available
          ? "FET CLI detected — real engine will be used."
          : "FET CLI not detected — internal fallback scheduler will be used."
      }
    >
      {available ? (
        <>
          <Wifi className="h-3 w-3" /> FET
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" /> Fallback
        </>
      )}
    </span>
  );
}
