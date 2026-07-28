"use client";

import { useProjectStore } from "@/lib/store";
import {
  StepHeader,
  AddButton,
  ConfirmDelete,
  EmptyRow,
  Field,
  NumberInput,
} from "./shared";
import { Input } from "@/components/ui";
import { MultiSelect } from "./MultiSelect";
import { TimeSlotGrid } from "./TimeSlotGrid";
import {
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  CalendarX2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useFocusOnAdd } from "./useFocusOnAdd";
import type { Teacher } from "@/lib/fet/types";

export function StepTeachers() {
  const project = useProjectStore((s) => s.project)!;
  const addTeacher = useProjectStore((s) => s.addTeacher);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { containerRef, handleAdd } = useFocusOnAdd(project.teachers.length);

  const teacherActivityCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of project.activities) {
      for (const t of a.teachers) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return map;
  }, [project.activities]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return project.teachers;
    return project.teachers.filter((t) =>
      `${t.name} ${t.code ?? ""} ${t.longName ?? ""}`.toLowerCase().includes(q)
    );
  }, [project.teachers, query]);

  return (
    <div>
      <StepHeader
        title="Teachers"
        description="Add every teacher who can be assigned to activities. Names must be unique. Filling in a teacher's limits here saves building the matching constraints by hand."
        icon={<Users className="h-4 w-4" />}
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Teachers list</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.teachers.length}{" "}
              {project.teachers.length === 1 ? "teacher" : "teachers"}
              {query && ` · ${visible.length} matching`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {project.teachers.length > 5 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search teachers…"
                  className="h-8 w-44 rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <AddButton onClick={() => handleAdd(addTeacher)} label="Add teacher" />
          </div>
        </div>

        <div ref={containerRef} className="space-y-2 p-4">
          {project.teachers.length === 0 ? (
            <EmptyRow
              message="No teachers yet. Add teachers who will lead activities."
              action={
                <AddButton
                  onClick={() => handleAdd(addTeacher)}
                  label="Add teacher"
                />
              }
            />
          ) : visible.length === 0 ? (
            <EmptyRow message={`No teacher matches “${query}”.`} />
          ) : (
            visible.map((t) => (
              <TeacherRow
                key={t.id}
                teacher={t}
                activityCount={teacherActivityCount.get(t.id) ?? 0}
                open={expanded === t.id}
                onToggle={() =>
                  setExpanded((cur) => (cur === t.id ? null : t.id))
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TeacherRow({
  teacher: t,
  activityCount,
  open,
  onToggle,
}: {
  teacher: Teacher;
  activityCount: number;
  open: boolean;
  onToggle: () => void;
}) {
  const project = useProjectStore((s) => s.project)!;
  const update = useProjectStore((s) => s.updateTeacher);
  const remove = useProjectStore((s) => s.removeTeacher);

  const subjectOptions = project.subjects.map((s) => ({
    value: s.id,
    label: s.name || "(unnamed)",
  }));

  // Anything that will turn into a constraint at generation time.
  const ruleCount =
    (t.maxHoursDaily ? 1 : 0) +
    (t.maxDaysPerWeek ? 1 : 0) +
    (t.maxGapsPerWeek !== undefined ? 1 : 0) +
    (t.notAvailableTimes?.length ? 1 : 0);

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "Hide details" : "Show details"}
          className="flex h-8 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <Input
          data-row-input
          value={t.name}
          onChange={(e) => update(t.id, { name: e.target.value })}
          placeholder="Teacher name (e.g. Dr. Ahmed)"
          className="h-9 min-w-[160px] flex-1"
        />
        <Input
          value={t.code ?? ""}
          onChange={(e) => update(t.id, { code: e.target.value || undefined })}
          placeholder="Code"
          title="Short code, e.g. AHM"
          className="h-9 w-24 shrink-0"
        />
        {ruleCount > 0 && (
          <span
            className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
            title="Rules on this teacher become constraints when you generate"
          >
            {ruleCount} {ruleCount === 1 ? "rule" : "rules"}
          </span>
        )}
        <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          {activityCount} activities
        </span>
        <ConfirmDelete
          title={`Delete "${t.name || "this teacher"}"?`}
          description={`They are used by ${activityCount} activit${activityCount === 1 ? "y" : "ies"}. Those activities keep their slot but lose this teacher, and constraints naming them are removed.`}
          onConfirm={() => remove(t.id)}
          label="Remove teacher"
        />
      </div>

      {open && (
        <div className="space-y-4 border-t border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" hint="Optional, when the name is a code like T001">
              <Input
                value={t.longName ?? ""}
                onChange={(e) =>
                  update(t.id, { longName: e.target.value || undefined })
                }
                placeholder="e.g. Dr. Ahmed Rahman"
                className="h-9"
              />
            </Field>
            <Field
              label="Teaches subjects"
              hint="Used to narrow the teacher picker on activities"
            >
              <MultiSelect
                options={subjectOptions}
                value={t.subjects ?? []}
                onChange={(v) =>
                  update(t.id, { subjects: v.length ? v : undefined })
                }
                placeholder="Any subject"
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Workload limits
            </div>
            <p className="mb-2.5 text-[11px] text-muted-foreground">
              Leave a box empty for no limit. Whatever you set here is applied at
              generation time; an explicit constraint for this teacher in step 8
              overrides it.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Max hours per day">
                <OptionalNumber
                  value={t.maxHoursDaily}
                  min={1}
                  max={project.hours.length || 24}
                  onChange={(v) => update(t.id, { maxHoursDaily: v })}
                />
              </Field>
              <Field label="Max days per week">
                <OptionalNumber
                  value={t.maxDaysPerWeek}
                  min={1}
                  max={project.days.length || 7}
                  onChange={(v) => update(t.id, { maxDaysPerWeek: v })}
                />
              </Field>
              <Field label="Max gaps per week">
                <OptionalNumber
                  value={t.maxGapsPerWeek}
                  min={0}
                  onChange={(v) => update(t.id, { maxGapsPerWeek: v })}
                />
              </Field>
            </div>
          </div>

          <Field
            label="Unavailable times"
            hint="Select the slots this teacher cannot teach; everything left clear is available."
          >
            {project.days.length === 0 || project.hours.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                <CalendarX2 className="h-3.5 w-3.5" />
                Set up days and hours in step 2 first.
              </div>
            ) : (
              <TimeSlotGrid
                days={project.days.map((d) => d.name)}
                hours={project.hours.map((h) => h.name)}
                value={t.notAvailableTimes ?? []}
                onChange={(v) =>
                  update(t.id, { notAvailableTimes: v.length ? v : undefined })
                }
              />
            )}
          </Field>
        </div>
      )}
    </div>
  );
}

/** A number box whose empty state means "no limit" rather than zero. */
function OptionalNumber({
  value,
  min,
  max,
  onChange,
}: {
  value: number | undefined;
  min?: number;
  max?: number;
  onChange: (v: number | undefined) => void;
}) {
  if (value === undefined) {
    return (
      <button
        type="button"
        onClick={() => onChange(min ?? 0)}
        className={cn(
          "flex h-9 w-full items-center rounded-md border border-dashed border-border px-3",
          "text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        No limit
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <NumberInput
        value={value}
        min={min}
        max={max}
        onChange={(v) => onChange(v)}
        className="h-9"
      />
      <button
        type="button"
        onClick={() => onChange(undefined)}
        title="Clear this limit"
        className="h-9 shrink-0 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-accent"
      >
        Clear
      </button>
    </div>
  );
}
