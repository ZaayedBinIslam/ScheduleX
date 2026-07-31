"use client";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useProjectStore } from "@/lib/store";
import { generateTimetable } from "@/lib/api";
import { ProjectLoadState } from "@/components/app/ProjectLoadState";
import { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Terminal,
  CalendarClock,
  Cpu,
  Timer,
  Clock,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import type { GenerateResult } from "@/lib/api";
import type { ValidationIssue } from "@/lib/fet/types";
import { validateProject } from "@/lib/fet/validate";

type Phase = "idle" | "generating" | "done" | "error";

const WARNING_PREVIEW = 8;

export function GeneratePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTimeout = parseInt(searchParams.get("timeout") || "5") || 5;

  const project = useProjectStore((s) => s.project);
  const save = useProjectStore((s) => s.save);
  const fetAvailable = useProjectStore((s) => s.fetAvailable);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<
    ValidationIssue[] | null
  >(null);
  const [log, setLog] = useState<string>("");
  const [forceFallback, setForceFallback] = useState(false);
  const [binaryPath, setBinaryPath] = useState("");
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(initialTimeout);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showAllWarnings, setShowAllWarnings] = useState(false);

  // Tick the elapsed clock while a run is in flight. The counter is zeroed in
  // run() rather than here, so this effect never sets state during render.
  useEffect(() => {
    if (phase !== "generating") return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [phase]);

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins > 0) {
      return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const run = async () => {
    if (!project || !id) return;
    setPhase("generating");
    setError(null);
    setResult(null);
    setLog("");
    setValidationIssues(null);
    setShowAllWarnings(false);
    setElapsedMs(0);

    // Save first
    await save();

    try {
      const res = await generateTimetable(id, {
        forceFallback: forceFallback,
        binaryPath: binaryPath.trim() || undefined,
        timeoutSeconds: Math.max(1, timeoutMinutes || 5) * 60,
      });
      setResult(res);
      setLog(res.log);
      setPhase("done");
      
      // Reload the project into the global store so the new timetable is available
      useProjectStore.getState().load(id);
    } catch (e) {
      const err = e as Error & { issues?: ValidationIssue[] };
      setError(err.message);
      if (err.issues) setValidationIssues(err.issues);
      setPhase("error");
    }
  };

  // Generation deliberately does not auto-start. It used to, which meant the
  // options below - including the time budget - were unreachable: the run was
  // already under way by the time the page rendered.

  if (!project) {
    return <ProjectLoadState />;
  }

  const issues = validationIssues ?? validateProject(project);
  const lockedCount =
    project.timetable?.entries.filter((e) => e.locked).length ?? 0;

  const finalDurationMs = result?.project.timetable?.durationMs ?? elapsedMs;
  const previousDurationMs = project.timetable?.durationMs;

  const timerLabel =
    phase === "generating"
      ? "Elapsed Time"
      : phase === "done"
        ? "Duration"
        : "Estimated Time";

  const timerValue =
    phase === "generating"
      ? formatMs(elapsedMs)
      : phase === "done"
        ? formatMs(finalDurationMs)
        : previousDurationMs
          ? `~${formatMs(previousDurationMs)} (prev)`
          : "< 5.0s (heuristic)";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => navigate(`/project/${id}`)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Generate timetable
          </h1>
          <p className="text-sm text-muted-foreground">
            {project.name || "Untitled"}
          </p>
        </div>
      </div>

      {/* Validation gate */}
      {(phase === "idle" || phase === "error") &&
        issues.filter((i) => i.level === "error").length > 0 && (
          <div className="mb-5 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <h2 className="font-semibold">Validation errors</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Fix these in the wizard before generating.
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {issues
                .filter((i) => i.level === "error")
                .map((i, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-destructive">
                    <span>•</span>
                    <span>{i.message}</span>
                  </li>
                ))}
            </ul>
            <Button
              className="mt-4"
              onClick={() => navigate(`/project/${id}`)}
            >
              Back to wizard
            </Button>
          </div>
        )}

      {/* Status panel */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              phase === "done"
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                : phase === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
            )}
          >
            {phase === "generating" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : phase === "done" ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : phase === "error" ? (
              <AlertCircle className="h-6 w-6" />
            ) : (
              <Sparkles className="h-6 w-6" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">
              {phase === "generating"
                ? "Generating timetable…"
                : phase === "done"
                  ? "Timetable generated"
                  : phase === "error"
                    ? "Generation failed"
                    : "Preparing to generate"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {phase === "generating"
                ? "Running the FET engine. This can take a moment."
                : phase === "done"
                  ? `${result?.project.timetable?.entries.length ?? 0} activities scheduled.`
                  : phase === "error"
                    ? error
                    : "Validating and saving project."}
            </p>
          </div>
        </div>

        {/* Engine info */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <InfoTile
            icon={<Cpu className="h-4 w-4" />}
            label="Engine"
            value={
              result
                ? result.engine === "fet"
                  ? "FET CLI"
                  : "Fallback scheduler"
                : fetAvailable
                  ? "FET CLI (planned)"
                  : "Fallback (planned)"
            }
          />
          <InfoTile
            icon={<Terminal className="h-4 w-4" />}
            label="Version"
            value={result?.fetVersion ?? (fetAvailable ? "detected" : "n/a")}
          />
          <InfoTile
            icon={<CalendarClock className="h-4 w-4" />}
            label="Activities"
            value={String(project.activities.filter((a) => a.active).length)}
          />
          <InfoTile
            icon={
              phase === "generating" ? (
                <Timer className="h-4 w-4 text-primary" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )
            }
            label={timerLabel}
            value={timerValue}
          />
        </div>

        {/* Locked activities carry over from the timetable editor, so say so
            before the user starts a run they expect to be from scratch. */}
        {lockedCount > 0 && phase !== "done" && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong className="font-medium">
                {lockedCount} locked{" "}
                {lockedCount === 1 ? "activity" : "activities"}
              </strong>{" "}
              will keep their current day, hour and room. Everything else is
              scheduled around them. Unlock them in the timetable editor to let
              FET move them again.
            </span>
          </div>
        )}

        {/* Options */}
        {phase !== "generating" && phase !== "done" && (
          <div className="mt-5 space-y-3.5 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <label
                htmlFor="time-budget"
                className="whitespace-nowrap text-sm font-medium text-foreground"
              >
                Time budget (minutes)
              </label>
              <input
                id="time-budget"
                type="number"
                min={1}
                max={120}
                value={timeoutMinutes}
                onChange={(e) =>
                  setTimeoutMinutes(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="h-9 w-24 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">
                How long FET may search. Harder timetables need longer; if the
                budget runs out you still get the best result found so far.
              </span>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forceFallback}
                onChange={(e) => setForceFallback(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Force internal fallback scheduler (skip FET CLI)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={binaryPath}
                onChange={(e) => setBinaryPath(e.target.value)}
                placeholder="Optional: custom FET binary path (e.g. /usr/local/bin/fet)"
                className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          {phase === "done" && (
            <>
              <Button
                onClick={() => navigate(`/project/${id}/timetable`)}
                className="gap-1.5"
              >
                View timetable
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={run} className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                Regenerate
              </Button>
            </>
          )}
          {phase === "error" && (
            <Button onClick={run} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Try again
            </Button>
          )}
          {phase === "idle" &&
            issues.filter((i) => i.level === "error").length === 0 && (
              <Button onClick={run} className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                Start generation
              </Button>
            )}
        </div>
      </div>

      {/* Warnings — FET's own warnings.txt can run to hundreds of lines, so
          only the first few are shown until the user asks for the rest. */}
      {result && result.warnings.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm dark:border-amber-700 dark:bg-amber-950">
          <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            {result.warnings.length}{" "}
            {result.warnings.length === 1 ? "warning" : "warnings"}
          </div>
          <ul className="mt-2 space-y-1 text-amber-800 dark:text-amber-200">
            {(showAllWarnings
              ? result.warnings
              : result.warnings.slice(0, WARNING_PREVIEW)
            ).map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
          {result.warnings.length > WARNING_PREVIEW && (
            <button
              onClick={() => setShowAllWarnings((v) => !v)}
              className="mt-2 text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
            >
              {showAllWarnings
                ? "Show fewer"
                : `Show all ${result.warnings.length} warnings`}
            </button>
          )}
        </div>
      )}

      {/* Unassigned */}
      {result?.project.timetable &&
        result.project.timetable.unassigned.length > 0 && (
          <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              {result.project.timetable.unassigned.length} activity(ies) could
              not be placed
            </div>
            <ul className="mt-2 space-y-1">
              {result.project.timetable.unassigned.map((u, i) => (
                <li key={i}>
                  • Activity #{u.activityId}: {u.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Log */}
      {log && (
        <div className="mt-5">
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            Engine log
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-300">
            {log}
          </pre>
        </div>
      )}
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
