"use client";

import { useProjectStore } from "@/lib/store";
import {
  StepHeader,
  DeleteButton,
  EmptyRow,
  NumberInput,
  Field,
} from "./shared";
import { Switch, Label, Badge } from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { MultiSelect, SingleSelect } from "./MultiSelect";
import { TimeSlotGrid } from "./TimeSlotGrid";
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { studentSetName } from "@/lib/fet/resolve";
import { uid } from "@/lib/fet/resolve";
import {
  TIME_CONSTRAINTS,
  SPACE_CONSTRAINTS,
  TIME_CONSTRAINT_TITLES,
  SPACE_CONSTRAINT_TITLES,
  newTimeConstraintDefaults,
  newSpaceConstraintDefaults,
  type ConstraintDef,
} from "@/lib/fet/constraintCatalog";
import type {
  SpaceConstraint,
  SpaceConstraintType,
  TimeConstraint,
  TimeConstraintType,
} from "@/lib/fet/types";

export function StepConstraints() {
  const project = useProjectStore((s) => s.project)!;
  const addTime = useProjectStore((s) => s.addTimeConstraint);
  const addSpace = useProjectStore((s) => s.addSpaceConstraint);
  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const [showSpaceMenu, setShowSpaceMenu] = useState(false);

  const addTimeOfType = (type: TimeConstraintType) => {
    addTime({
      id: uid("tc_"),
      type,
      weight: 100,
      active: true,
      ...newTimeConstraintDefaults(
        type,
        project.days[0]?.name ?? "",
        project.hours[0]?.name ?? ""
      ),
    } as TimeConstraint);
    setShowTimeMenu(false);
  };

  const addSpaceOfType = (type: SpaceConstraintType) => {
    addSpace({
      id: uid("sc_"),
      type,
      weight: 100,
      active: true,
      ...newSpaceConstraintDefaults(type),
    } as SpaceConstraint);
    setShowSpaceMenu(false);
  };

  return (
    <div>
      <StepHeader
        title="Constraints"
        description="Constraints tell the engine what is allowed or preferred. FET has hundreds — this step exposes the most useful ones. Basic compulsory constraints are always included automatically."
        icon={<ShieldCheck className="h-4 w-4" />}
      />

      <div className="space-y-6">
        {/* TIME CONSTRAINTS */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Time constraints</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {project.timeConstraints.length} rule(s)
                </p>
              </div>
            </div>
            <AddMenu
              open={showTimeMenu}
              onOpenChange={setShowTimeMenu}
              templates={TIME_CONSTRAINTS}
              onAdd={(t) => addTimeOfType(t as TimeConstraintType)}
              label="Add time constraint"
            />
          </div>
          <div className="space-y-2 p-4">
            {project.timeConstraints.length === 0 ? (
              <EmptyRow message="No time constraints. Basic compulsory rules are always applied." />
            ) : (
              project.timeConstraints.map((c) => (
                <TimeConstraintCard key={c.id} c={c} />
              ))
            )}
          </div>
        </div>

        {/* SPACE CONSTRAINTS */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Space constraints</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {project.spaceConstraints.length} rule(s)
                </p>
              </div>
            </div>
            <AddMenu
              open={showSpaceMenu}
              onOpenChange={setShowSpaceMenu}
              templates={SPACE_CONSTRAINTS}
              onAdd={(t) => addSpaceOfType(t as SpaceConstraintType)}
              label="Add space constraint"
            />
          </div>
          <div className="space-y-2 p-4">
            {project.spaceConstraints.length === 0 ? (
              <EmptyRow message="No space constraints. Basic compulsory rules are always applied." />
            ) : (
              project.spaceConstraints.map((c) => (
                <SpaceConstraintCard key={c.id} c={c} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMenu({
  open,
  onOpenChange,
  templates,
  onAdd,
  label,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  templates: ConstraintDef<string>[];
  onAdd: (type: string) => void;
  label: string;
}) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = () => {
    onOpenChange(false);
    setQuery("");
    setHighlight(0);
  };

  // Match on label, hint and category so "teacher", "gap" and "room" all work.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      `${t.label} ${t.hint} ${t.category}`.toLowerCase().includes(q)
    );
  }, [templates, query]);

  // Group for display while keeping `matches` a flat list, so arrow-key
  // navigation can run over a single index space.
  const groups = useMemo(() => {
    const byCategory = new Map<string, { def: ConstraintDef<string>; index: number }[]>();
    matches.forEach((def, index) => {
      const list = byCategory.get(def.category) ?? [];
      list.push({ def, index });
      byCategory.set(def.category, list);
    });
    return [...byCategory.entries()];
  }, [matches]);

  const choose = (type: string) => {
    onAdd(type);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && matches[highlight]) {
      e.preventDefault();
      choose(matches[highlight].type);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          const next = !open;
          onOpenChange(next);
          if (next) {
            setQuery("");
            setHighlight(0);
            // Let the popover mount before focusing the search box.
            requestAnimationFrame(() => searchRef.current?.focus());
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
      >
        <Plus className="h-3.5 w-3.5" />
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            className="absolute right-0 z-20 mt-1 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
            onKeyDown={onKeyDown}
          >
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlight(0);
                  }}
                  placeholder={`Search ${templates.length} constraints…`}
                  className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
              {matches.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No constraint matches “{query}”.
                </li>
              )}
              {groups.map(([category, items]) => (
                <li key={category}>
                  <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {category}
                  </div>
                  <ul>
                    {items.map(({ def, index }) => (
                      <li key={def.type}>
                        <button
                          role="option"
                          aria-selected={index === highlight}
                          onMouseEnter={() => setHighlight(index)}
                          onClick={() => choose(def.type)}
                          className={cn(
                            "block w-full px-3 py-1.5 text-left",
                            index === highlight ? "bg-accent" : "hover:bg-accent"
                          )}
                        >
                          <div className="text-sm font-medium">{def.label}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {def.hint}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function ConstraintShell({
  title,
  badge,
  weight,
  active,
  onWeight,
  onActive,
  onDelete,
  children,
  defaultOpen = true,
}: {
  title: string;
  badge?: ReactNode;
  weight: number;
  active: boolean;
  onWeight: (n: number) => void;
  onActive: (b: boolean) => void;
  onDelete: () => void;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <span className="font-medium">{title}</span>
        {badge}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-[11px] text-muted-foreground">Weight</Label>
            <div className="w-16">
              <NumberInput
                value={weight}
                min={0}
                max={100}
                onChange={onWeight}
                className="h-7 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch checked={active} onCheckedChange={onActive} id={`a-${title}`} />
          </div>
          <DeleteButton onClick={onDelete} />
        </div>
      </div>
      {open && active && (
        <div className="space-y-3 border-t border-border p-3">{children}</div>
      )}
    </div>
  );
}

function TimeConstraintCard({ c }: { c: TimeConstraint }) {
  const project = useProjectStore((s) => s.project)!;
  const update = useProjectStore((s) => s.updateTimeConstraint);
  const remove = useProjectStore((s) => s.removeTimeConstraint);

  const teacherOptions = project.teachers.map((t) => ({
    value: t.id,
    label: t.name || "(unnamed)",
  }));
  const studentOptions = project.students.flatMap((y) => [
    { value: y.id, label: `${y.name || "(year)"} (year)` },
    ...y.groups.map((g) => ({ value: g.id, label: `${g.name} (group)` })),
    ...y.groups.flatMap((g) =>
      g.subgroups.map((sg) => ({
        value: sg.id,
        label: `${sg.name} (subgroup)`,
      }))
    ),
  ]);
  const activityOptions = project.activities.map((a) => ({
    value: String(a.id),
    label: `#${a.id} ${project.subjects.find((s) => s.id === a.subject)?.name ?? ""}`,
  }));
  const subjectOptions = project.subjects.map((s) => ({
    value: s.id,
    label: s.name || "(unnamed)",
  }));
  const activityTagOptions = project.activityTags.map((t) => ({
    value: t.id,
    label: t.name || "(unnamed)",
  }));

  const setSlot = (slot: { day: string; hour: string } | undefined) => {
    update(c.id, { preferredStartingTime: slot });
  };

  return (
    <ConstraintShell
      title={TIME_CONSTRAINT_TITLES[c.type]}
      weight={c.weight}
      active={c.active}
      onWeight={(n) => update(c.id, { weight: n })}
      onActive={(b) => update(c.id, { active: b })}
      onDelete={() => remove(c.id)}
    >
      {c.type === "TeacherNotAvailable" && (
        <>
          <Field label="Teacher">
            <SingleSelect
              options={teacherOptions}
              value={c.teacherId ?? ""}
              onChange={(v) => update(c.id, { teacherId: v })}
              placeholder="Select teacher"
            />
          </Field>
          <Field label="Not-available slots">
            <TimeSlotGrid
              days={project.days.map((d) => d.name)}
              hours={project.hours.map((h) => h.name)}
              value={c.notAvailableTimes ?? []}
              onChange={(v) => update(c.id, { notAvailableTimes: v })}
            />
          </Field>
        </>
      )}

      {(c.type === "TeacherMaxDaysPerWeek" ||
        c.type === "TeacherMinDaysPerWeek") && (
        <>
          <Field label="Teacher">
            <SingleSelect
              options={teacherOptions}
              value={c.teacherId ?? ""}
              onChange={(v) => update(c.id, { teacherId: v })}
              placeholder="Select teacher"
            />
          </Field>
          <Field label={c.type === "TeacherMaxDaysPerWeek" ? "Max days" : "Min days"}>
            <NumberInput
              value={c.type === "TeacherMaxDaysPerWeek" ? c.maxDays ?? 5 : c.minDays ?? 1}
              min={0}
              max={7}
              onChange={(v) =>
                update(c.id, c.type === "TeacherMaxDaysPerWeek" ? { maxDays: v } : { minDays: v })
              }
            />
          </Field>
        </>
      )}

      {(c.type === "TeacherMaxHoursDaily" ||
        c.type === "TeacherMaxHoursContinuously") && (
        <>
          <Field label="Teacher">
            <SingleSelect
              options={teacherOptions}
              value={c.teacherId ?? ""}
              onChange={(v) => update(c.id, { teacherId: v })}
              placeholder="Select teacher"
            />
          </Field>
          <Field
            label={
              c.type === "TeacherMaxHoursDaily"
                ? "Max hours per day"
                : "Max hours in a row"
            }
          >
            <NumberInput
              value={c.maxHours ?? (c.type === "TeacherMaxHoursDaily" ? 6 : 4)}
              min={1}
              onChange={(v) => update(c.id, { maxHours: v })}
            />
          </Field>
        </>
      )}

      {c.type === "TeacherMaxGapsPerWeek" && (
        <>
          <Field label="Teacher">
            <SingleSelect
              options={teacherOptions}
              value={c.teacherId ?? ""}
              onChange={(v) => update(c.id, { teacherId: v })}
              placeholder="Select teacher"
            />
          </Field>
          <Field label="Max gaps per week">
            <NumberInput
              value={c.maxGaps ?? 0}
              min={0}
              onChange={(v) => update(c.id, { maxGaps: v })}
            />
          </Field>
        </>
      )}

      {c.type === "StudentsSetNotAvailable" && (
        <>
          <Field label="Students">
            <SingleSelect
              options={studentOptions}
              value={c.studentsSetId ?? ""}
              onChange={(v) => update(c.id, { studentsSetId: v })}
              placeholder="Select student set"
            />
          </Field>
          <Field label="Not-available slots">
            <TimeSlotGrid
              days={project.days.map((d) => d.name)}
              hours={project.hours.map((h) => h.name)}
              value={c.notAvailableTimes ?? []}
              onChange={(v) => update(c.id, { notAvailableTimes: v })}
            />
          </Field>
        </>
      )}

      {(c.type === "StudentsSetMaxHoursDaily" ||
        c.type === "StudentsSetMaxHoursContinuously" ||
        c.type === "StudentsSetMinHoursDaily") && (
        <>
          <Field label="Students">
            <SingleSelect
              options={studentOptions}
              value={c.studentsSetId ?? ""}
              onChange={(v) => update(c.id, { studentsSetId: v })}
              placeholder="Select student set"
            />
          </Field>
          {c.type === "StudentsSetMinHoursDaily" ? (
            <Field label="Min hours per day">
              <NumberInput
                value={c.minHours ?? 1}
                min={1}
                onChange={(v) => update(c.id, { minHours: v })}
              />
            </Field>
          ) : (
            <Field
              label={
                c.type === "StudentsSetMaxHoursDaily"
                  ? "Max hours per day"
                  : "Max hours in a row"
              }
            >
              <NumberInput
                value={
                  c.maxHours ?? (c.type === "StudentsSetMaxHoursDaily" ? 6 : 4)
                }
                min={1}
                onChange={(v) => update(c.id, { maxHours: v })}
              />
            </Field>
          )}
        </>
      )}

      {c.type === "ActivityPreferredStartingTime" && (
        <>
          <Field label="Activity">
            <SingleSelect
              options={activityOptions}
              value={String(c.activityIds?.[0] ?? "")}
              onChange={(v) =>
                update(c.id, { activityIds: v ? [parseInt(v, 10)] : [] })
              }
              placeholder="Select activity"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Day">
              <Select
                value={c.preferredStartingTime?.day ?? ""}
                onValueChange={(v) =>
                  setSlot({ day: v, hour: c.preferredStartingTime?.hour ?? project.hours[0]?.name ?? "" })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  {project.days.map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Hour">
              <Select
                value={c.preferredStartingTime?.hour ?? ""}
                onValueChange={(v) =>
                  setSlot({ day: c.preferredStartingTime?.day ?? project.days[0]?.name ?? "", hour: v })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {project.hours.map((h) => (
                    <SelectItem key={h.name} value={h.name}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </>
      )}

      {(c.type === "MinNDaysBetweenActivities" ||
        c.type === "MaxNDaysBetweenActivities" ||
        c.type === "ActivitiesSameStartingTime" ||
        c.type === "ActivitiesNotOverlapping") && (
        <>
          <Field label="Activities">
            <MultiSelect
              options={activityOptions}
              value={(c.activityIds ?? []).map(String)}
              onChange={(v) =>
                update(c.id, { activityIds: v.map((x) => parseInt(x, 10)) })
              }
              placeholder="Select activities"
            />
          </Field>
          {c.type === "MinNDaysBetweenActivities" && (
            <Field label="Min days between">
              <NumberInput
                value={c.minNDays ?? 1}
                min={1}
                onChange={(v) => update(c.id, { minNDays: v })}
              />
            </Field>
          )}
          {c.type === "MaxNDaysBetweenActivities" && (
            <Field label="Max days between">
              <NumberInput
                value={c.maxNDays ?? 1}
                min={1}
                onChange={(v) => update(c.id, { maxNDays: v })}
              />
            </Field>
          )}
        </>
      )}

      {(c.type === "TwoActivitiesConsecutive" ||
        c.type === "TwoActivitiesGrouped") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First activity">
            <SingleSelect
              options={activityOptions}
              value={String(c.firstActivityId ?? "")}
              onChange={(v) =>
                update(c.id, {
                  firstActivityId: v ? parseInt(v, 10) : undefined,
                })
              }
              placeholder="Select activity"
            />
          </Field>
          <Field label="Second activity">
            <SingleSelect
              options={activityOptions}
              value={String(c.secondActivityId ?? "")}
              onChange={(v) =>
                update(c.id, {
                  secondActivityId: v ? parseInt(v, 10) : undefined,
                })
              }
              placeholder="Select activity"
            />
          </Field>
        </div>
      )}

      {c.type === "ActivityEndsStudentsDay" && (
        <Field label="Activity">
          <SingleSelect
            options={activityOptions}
            value={String(c.activityIds?.[0] ?? "")}
            onChange={(v) =>
              update(c.id, { activityIds: v ? [parseInt(v, 10)] : [] })
            }
            placeholder="Select activity"
          />
        </Field>
      )}

      {c.type === "BreakTimes" && (
        <Field label="Break times">
          <TimeSlotGrid
            days={project.days.map((d) => d.name)}
            hours={project.hours.map((h) => h.name)}
            value={c.breakTimes ?? []}
            onChange={(v) => update(c.id, { breakTimes: v })}
          />
        </Field>
      )}

      {c.type === "ActivityPreferredTimeSlots" && (
        <>
          <Field label="Activity">
            <SingleSelect
              options={activityOptions}
              value={String(c.activityIds?.[0] ?? "")}
              onChange={(v) =>
                update(c.id, { activityIds: v ? [parseInt(v, 10)] : [] })
              }
              placeholder="Select activity"
            />
          </Field>
          <Field label="Preferred time slots">
            <TimeSlotGrid
              days={project.days.map((d) => d.name)}
              hours={project.hours.map((h) => h.name)}
              value={c.preferredTimes ?? []}
              onChange={(v) => update(c.id, { preferredTimes: v })}
            />
          </Field>
        </>
      )}

      {c.type === "ActivitiesPreferredTimeSlots" && (
        <>
          <Field label="Teacher (optional)">
            <SingleSelect
              options={teacherOptions}
              value={c.teacherId ?? ""}
              onChange={(v) => update(c.id, { teacherId: v })}
              placeholder="Any teacher"
            />
          </Field>
          <Field label="Students (optional)">
            <SingleSelect
              options={studentOptions}
              value={c.studentsSetId ?? ""}
              onChange={(v) => update(c.id, { studentsSetId: v })}
              placeholder="Any students"
            />
          </Field>
          <Field label="Subject (optional)">
            <SingleSelect
              options={subjectOptions}
              value={c.subjectId ?? ""}
              onChange={(v) => update(c.id, { subjectId: v })}
              placeholder="Any subject"
            />
          </Field>
          <Field label="Activity tag (optional)">
            <SingleSelect
              options={activityTagOptions}
              value={c.activityTagId ?? ""}
              onChange={(v) => update(c.id, { activityTagId: v })}
              placeholder="Any tag"
            />
          </Field>
          <Field label="Preferred time slots">
            <TimeSlotGrid
              days={project.days.map((d) => d.name)}
              hours={project.hours.map((h) => h.name)}
              value={c.preferredTimes ?? []}
              onChange={(v) => update(c.id, { preferredTimes: v })}
            />
          </Field>
        </>
      )}

      {c.type === "MinDaysBetweenActivities" && (
        <>
          <Field label="Activities">
            <MultiSelect
              options={activityOptions}
              value={(c.activityIds ?? []).map(String)}
              onChange={(v) =>
                update(c.id, { activityIds: v.map((x) => parseInt(x, 10)) })
              }
              placeholder="Select activities"
            />
          </Field>
          <Field label="Consecutive if same day">
            <div className="flex h-9 items-center px-3 border border-border rounded-md bg-background">
              <Switch
                checked={c.consecutiveIfSameDay ?? false}
                onCheckedChange={(v) => update(c.id, { consecutiveIfSameDay: v })}
              />
            </div>
          </Field>
        </>
      )}

      {c.type === "ActivitiesSameStartingHour" && (
        <Field label="Activities">
          <MultiSelect
            options={activityOptions}
            value={(c.activityIds ?? []).map(String)}
            onChange={(v) =>
              update(c.id, { activityIds: v.map((x) => parseInt(x, 10)) })
            }
            placeholder="Select activities"
          />
        </Field>
      )}

      {c.type === "MinGapsBetweenActivities" && (
        <>
          <Field label="Activities">
            <MultiSelect
              options={activityOptions}
              value={(c.activityIds ?? []).map(String)}
              onChange={(v) =>
                update(c.id, { activityIds: v.map((x) => parseInt(x, 10)) })
              }
              placeholder="Select activities"
            />
          </Field>
          <Field label="Min gaps">
            <NumberInput
              value={c.minGapsBetweenActivities ?? 1}
              min={1}
              onChange={(v) => update(c.id, { minGapsBetweenActivities: v })}
            />
          </Field>
        </>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">
          weight {c.weight}%
        </Badge>
        {c.type.startsWith("Teacher") && c.teacherId && (
          <span>· {project.teachers.find((t) => t.id === c.teacherId)?.name}</span>
        )}
        {c.type.startsWith("StudentsSet") && c.studentsSetId && (
          <span>· {studentSetName(project, c.studentsSetId)}</span>
        )}
      </div>
    </ConstraintShell>
  );
}

function SpaceConstraintCard({ c }: { c: SpaceConstraint }) {
  const project = useProjectStore((s) => s.project)!;
  const update = useProjectStore((s) => s.updateSpaceConstraint);
  const remove = useProjectStore((s) => s.removeSpaceConstraint);

  const roomOptions = project.rooms.map((r) => ({
    value: r.id,
    label: r.name || "(unnamed)",
  }));
  const teacherOptions = project.teachers.map((t) => ({
    value: t.id,
    label: t.name || "(unnamed)",
  }));
  const subjectOptions = project.subjects.map((s) => ({
    value: s.id,
    label: s.name || "(unnamed)",
  }));
  const studentOptions = project.students.flatMap((y) => [
    { value: y.id, label: `${y.name} (year)` },
    ...y.groups.map((g) => ({ value: g.id, label: `${g.name} (group)` })),
    ...y.groups.flatMap((g) =>
      g.subgroups.map((sg) => ({ value: sg.id, label: `${sg.name} (subgroup)` }))
    ),
  ]);
  const activityOptions = project.activities.map((a) => ({
    value: String(a.id),
    label: `#${a.id} ${project.subjects.find((s) => s.id === a.subject)?.name ?? ""}`,
  }));
  const activityTagOptions = project.activityTags.map((t) => ({
    value: t.id,
    label: t.name || "(unnamed)",
  }));

  return (
    <ConstraintShell
      title={SPACE_CONSTRAINT_TITLES[c.type]}
      weight={c.weight}
      active={c.active}
      onWeight={(n) => update(c.id, { weight: n })}
      onActive={(b) => update(c.id, { active: b })}
      onDelete={() => remove(c.id)}
    >
      {c.type === "RoomNotAvailable" && (
        <>
          <Field label="Room">
            <SingleSelect
              options={roomOptions}
              value={c.roomId ?? ""}
              onChange={(v) => update(c.id, { roomId: v })}
              placeholder="Select room"
            />
          </Field>
          <Field label="Not-available slots">
            <TimeSlotGrid
              days={project.days.map((d) => d.name)}
              hours={project.hours.map((h) => h.name)}
              value={c.notAvailableTimes ?? []}
              onChange={(v) => update(c.id, { notAvailableTimes: v })}
            />
          </Field>
        </>
      )}

      {c.type === "SubjectPreferredRoom" && (
        <>
          <Field label="Subject">
            <SingleSelect
              options={subjectOptions}
              value={c.subjectId ?? ""}
              onChange={(v) => update(c.id, { subjectId: v })}
              placeholder="Select subject"
            />
          </Field>
          <Field label="Preferred room">
            <SingleSelect
              options={roomOptions}
              value={c.roomId ?? ""}
              onChange={(v) => update(c.id, { roomId: v })}
              placeholder="Select room"
            />
          </Field>
        </>
      )}

      {c.type === "ActivityPreferredRoom" && (
        <>
          <Field label="Activity">
            <SingleSelect
              options={activityOptions}
              value={String(c.activityId ?? "")}
              onChange={(v) =>
                update(c.id, { activityId: v ? parseInt(v, 10) : undefined })
              }
              placeholder="Select activity"
            />
          </Field>
          <Field label="Preferred room">
            <SingleSelect
              options={roomOptions}
              value={c.roomId ?? ""}
              onChange={(v) => update(c.id, { roomId: v })}
              placeholder="Select room"
            />
          </Field>
        </>
      )}

      {c.type === "StudentsSetHomeRoom" && (
        <>
          <Field label="Students">
            <SingleSelect
              options={studentOptions}
              value={c.studentsSetId ?? ""}
              onChange={(v) => update(c.id, { studentsSetId: v })}
              placeholder="Select student set"
            />
          </Field>
          <Field label="Home room">
            <SingleSelect
              options={roomOptions}
              value={c.roomId ?? ""}
              onChange={(v) => update(c.id, { roomId: v })}
              placeholder="Select room"
            />
          </Field>
        </>
      )}

      {c.type === "TeacherPreferredRoom" && (
        <>
          <Field label="Teacher">
            <SingleSelect
              options={teacherOptions}
              value={c.teacherId ?? ""}
              onChange={(v) => update(c.id, { teacherId: v })}
              placeholder="Select teacher"
            />
          </Field>
          <Field label="Home room">
            <SingleSelect
              options={roomOptions}
              value={c.roomId ?? ""}
              onChange={(v) => update(c.id, { roomId: v })}
              placeholder="Select room"
            />
          </Field>
        </>
      )}

      {c.type === "ActivityPreferredRooms" && (
        <>
          <Field label="Activity">
            <SingleSelect
              options={activityOptions}
              value={String(c.activityId ?? "")}
              onChange={(v) =>
                update(c.id, { activityId: v ? parseInt(v, 10) : undefined })
              }
              placeholder="Select activity"
            />
          </Field>
          <Field label="Preferred rooms">
            <MultiSelect
              options={roomOptions}
              value={c.roomIds ?? []}
              onChange={(v) => update(c.id, { roomIds: v })}
              placeholder="Select rooms"
            />
          </Field>
        </>
      )}

      {c.type === "SubjectPreferredRooms" && (
        <>
          <Field label="Subject">
            <SingleSelect
              options={subjectOptions}
              value={c.subjectId ?? ""}
              onChange={(v) => update(c.id, { subjectId: v })}
              placeholder="Select subject"
            />
          </Field>
          <Field label="Preferred rooms">
            <MultiSelect
              options={roomOptions}
              value={c.roomIds ?? []}
              onChange={(v) => update(c.id, { roomIds: v })}
              placeholder="Select rooms"
            />
          </Field>
        </>
      )}

      {c.type === "SubjectActivityTagPreferredRoom" && (
        <>
          <Field label="Subject">
            <SingleSelect
              options={subjectOptions}
              value={c.subjectId ?? ""}
              onChange={(v) => update(c.id, { subjectId: v })}
              placeholder="Select subject"
            />
          </Field>
          <Field label="Activity Tag">
            <SingleSelect
              options={activityTagOptions}
              value={c.activityTagId ?? ""}
              onChange={(v) => update(c.id, { activityTagId: v })}
              placeholder="Select tag"
            />
          </Field>
          <Field label="Preferred room">
            <SingleSelect
              options={roomOptions}
              value={c.roomId ?? ""}
              onChange={(v) => update(c.id, { roomId: v })}
              placeholder="Select room"
            />
          </Field>
        </>
      )}

      {c.type === "ActivitiesOccupyMaxDifferentRooms" && (
        <>
          <Field label="Activities">
            <MultiSelect
              options={activityOptions}
              value={(c.activityIds ?? []).map(String)}
              onChange={(v) =>
                update(c.id, { activityIds: v.map((x) => parseInt(x, 10)) })
              }
              placeholder="Select activities"
            />
          </Field>
          <Field label="Max different rooms">
            <NumberInput
              value={c.maxRooms ?? 1}
              min={1}
              onChange={(v) => update(c.id, { maxRooms: v })}
            />
          </Field>
        </>
      )}

      {c.type === "ActivitiesSameRoomIfConsecutive" && (
        <Field label="Activities">
          <MultiSelect
            options={activityOptions}
            value={(c.activityIds ?? []).map(String)}
            onChange={(v) =>
              update(c.id, { activityIds: v.map((x) => parseInt(x, 10)) })
            }
            placeholder="Select activities"
          />
        </Field>
      )}
    </ConstraintShell>
  );
}
