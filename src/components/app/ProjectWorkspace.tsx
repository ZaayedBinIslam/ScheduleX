"use client";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useProjectStore } from "@/lib/store";
import { validateProject } from "@/lib/fet/validate";
import {
  Building2,
  CalendarDays,
  Users,
  BookOpen,
  GraduationCap,
  ListChecks,
  DoorOpen,
  ShieldCheck,
  ClipboardCheck,
  Loader2,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { StepInstitution } from "@/components/wizard/StepInstitution";
import { StepGrid } from "@/components/wizard/StepGrid";
import { StepTeachers } from "@/components/wizard/StepTeachers";
import { StepSubjects } from "@/components/wizard/StepSubjects";
import { StepStudents } from "@/components/wizard/StepStudents";
import { StepActivities } from "@/components/wizard/StepActivities";
import { StepRooms } from "@/components/wizard/StepRooms";
import { StepConstraints } from "@/components/wizard/StepConstraints";
import { StepReview } from "@/components/wizard/StepReview";

const STEPS = [
  { n: 1, key: "institution", label: "Institution", icon: Building2 },
  { n: 2, key: "grid", label: "Days & Hours", icon: CalendarDays },
  { n: 3, key: "teachers", label: "Teachers", icon: Users },
  { n: 4, key: "subjects", label: "Subjects & Tags", icon: BookOpen },
  { n: 5, key: "students", label: "Students", icon: GraduationCap },
  { n: 6, key: "activities", label: "Activities", icon: ListChecks },
  { n: 7, key: "rooms", label: "Rooms", icon: DoorOpen },
  { n: 8, key: "constraints", label: "Constraints", icon: ShieldCheck },
  { n: 9, key: "review", label: "Review & Generate", icon: ClipboardCheck },
] as const;

export function ProjectWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const project = useProjectStore((s) => s.project);
  const loading = useProjectStore((s) => s.loading);

  const stepParam = parseInt(search.get("step") ?? "1", 10);
  const step = Number.isNaN(stepParam) ? 1 : Math.min(9, Math.max(1, stepParam));

  const setStep = (n: number) => {
    const next = new URLSearchParams(search);
    next.set("step", String(n));
    setSearch(next, { replace: true });
  };

  const issues = useMemo(
    () => (project ? validateProject(project) : []),
    [project]
  );
  const errors = issues.filter((i) => i.level === "error");

  if (loading || !project) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading project…
      </div>
    );
  }

  if (id && project.id !== id) {
    // still loading the right project
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Syncing…
      </div>
    );
  }

  const current = STEPS[step - 1];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-[72px] lg:self-start">
          <div className="rounded-xl border border-border bg-card p-2">
            <div className="px-2 py-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Setup wizard
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                {project.name || "Untitled"}
              </div>
            </div>
            <ol className="mt-1 space-y-0.5">
              {STEPS.map((s) => {
                const active = s.n === step;
                const done = s.n < step;
                return (
                  <li key={s.n}>
                    <button
                      onClick={() => setStep(s.n)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : done
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {done ? "✓" : s.n}
                      </span>
                      <span className="flex items-center gap-1.5 truncate">
                        <s.icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                        <span className="truncate">{s.label}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Validation</span>
              <span
                className={cn(
                  "font-medium",
                  errors.length ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {errors.length ? `${errors.length} error(s)` : "No errors"}
              </span>
            </div>
            {errors.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-destructive">
                {errors.slice(0, 6).map((e, i) => (
                  <li key={i} className="leading-tight">
                    • {e.message}
                  </li>
                ))}
                {errors.length > 6 && (
                  <li className="text-muted-foreground">
                    +{errors.length - 6} more…
                  </li>
                )}
              </ul>
            )}
          </div>

          {project.timetable && (
            <Button
              onClick={() => navigate(`/project/${project.id}/timetable`)}
              variant="outline"
              className="mt-3 w-full gap-1.5"
            >
              <CalendarClock className="h-4 w-4" />
              View timetable
            </Button>
          )}
        </aside>

        {/* Step content */}
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <current.icon className="h-4 w-4" />
              Step {step} of {STEPS.length} — {current.label}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={step === 1}
                onClick={() => setStep(step - 1)}
              >
                Previous
              </Button>
              {step < STEPS.length ? (
                <Button size="sm" onClick={() => setStep(step + 1)}>
                  Next
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate(`/project/${project.id}/generate`)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-5 sm:p-6">
            {step === 1 && <StepInstitution />}
            {step === 2 && <StepGrid />}
            {step === 3 && <StepTeachers />}
            {step === 4 && <StepSubjects />}
            {step === 5 && <StepStudents />}
            {step === 6 && <StepActivities />}
            {step === 7 && <StepRooms />}
            {step === 8 && <StepConstraints />}
            {step === 9 && <StepReview />}
          </div>

          <div className="mt-4 flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={step === 1}
              onClick={() => setStep(step - 1)}
            >
              ← Back
            </Button>
            {step < STEPS.length && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStep(step + 1)}
              >
                Continue →
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
