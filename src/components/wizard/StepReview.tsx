"use client";

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/lib/store";
import { validateProject, projectStats, hasErrors } from "@/lib/fet/validate";
import { StepHeader } from "./shared";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

export function StepReview() {
  const project = useProjectStore((s) => s.project)!;
  const save = useProjectStore((s) => s.save);
  const fetAvailable = useProjectStore((s) => s.fetAvailable);
  const navigate = useNavigate();
  const { id } = useParams();
  const [timeoutMinutes, setTimeoutMinutes] = useState(5);

  const issues = validateProject(project);
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const stats = projectStats(project);

  const onGenerate = async () => {
    await save();
    navigate(`/project/${id}/generate?timeout=${timeoutMinutes}`);
  };

  const ready = !hasErrors(issues) && stats.activities > 0;

  return (
    <div>
      <StepHeader
        title="Review & generate"
        description="Check the summary, fix any errors, then generate the timetable with the FET engine."
        icon={<Sparkles className="h-4 w-4" />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Project summary</h2>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-border sm:grid-cols-3 lg:grid-cols-4">
              <SummaryCell label="Days" value={stats.days} />
              <SummaryCell label="Hours/day" value={stats.hours} />
              <SummaryCell label="Teachers" value={stats.teachers} />
              <SummaryCell label="Subjects" value={stats.subjects} />
              <SummaryCell label="Activity tags" value={stats.activityTags} />
              <SummaryCell label="Student years" value={stats.students} />
              <SummaryCell label="Subgroups" value={stats.subgroups} />
              <SummaryCell label="Activities" value={stats.activities} />
              <SummaryCell label="Rooms" value={stats.rooms} />
              <SummaryCell label="Time rules" value={stats.timeConstraints} />
              <SummaryCell label="Space rules" value={stats.spaceConstraints} />
              <SummaryCell
                label="Weekly slots"
                value={stats.days * stats.hours}
              />
            </div>
          </div>

          {/* Validation */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Validation</h2>
            </div>
            <div className="p-4">
              {issues.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  No issues — project is ready to generate.
                </div>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {issues.map((i, idx) => (
                    <li
                      key={idx}
                      className={cn(
                        "flex items-start gap-2",
                        i.level === "error"
                          ? "text-destructive"
                          : "text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {i.level === "error" ? (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <span>{i.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Generate panel */}
        <aside className="lg:sticky lg:top-[72px] lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Generation engine</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Engine</span>
                <span className="font-medium">
                  {fetAvailable ? "FET CLI" : "Fallback scheduler"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timeout limit</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={timeoutMinutes}
                    onChange={(e) =>
                      setTimeoutMinutes(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="h-7 w-16 rounded border border-border bg-background px-2 text-right text-xs font-medium outline-none focus:ring-1 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Errors</span>
                <span
                  className={cn(
                    "font-medium",
                    errors.length ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {errors.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Warnings</span>
                <span className="font-medium">{warnings.length}</span>
              </div>
            </div>

            <Button
              onClick={onGenerate}
              disabled={!ready}
              className="mt-5 w-full gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              Generate timetable
              <ArrowRight className="h-4 w-4" />
            </Button>
            {!ready && (
              <p className="mt-2 text-xs text-muted-foreground">
                {errors.length
                  ? "Resolve all errors before generating."
                  : "Add at least one activity."}
              </p>
            )}
            {project.timetable && (
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => navigate(`/project/${id}/timetable`)}
              >
                View existing timetable
              </Button>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
            {fetAvailable ? (
              <>
                The backend will write a <code>.fet</code> file and run the real
                FET CLI. Large institutions may take a few minutes.
              </>
            ) : (
              <>
                <strong className="text-foreground">FET not detected.</strong>{" "}
                The internal fallback scheduler will produce a valid timetable
                honouring the main constraints. Install FET and refresh to use
                the full engine.
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
