"use client";

import { useProjectStore } from "@/lib/store";
import {
  StepHeader,
  AddButton,
  ConfirmDelete,
  DeleteButton,
  EmptyRow,
  NumberInput,
} from "./shared";
import { Input } from "@/components/ui";
import {
  GraduationCap,
  ChevronDown,
  Plus,
  ChevronRight,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useFocusOnAdd } from "./useFocusOnAdd";
import type { StudentGroup, StudentYear } from "@/lib/fet/types";

const sumSubgroups = (g: StudentGroup) =>
  g.subgroups.reduce((n, sg) => n + (sg.numberOfStudents || 0), 0);

export function StepStudents() {
  const project = useProjectStore((s) => s.project)!;
  const addYear = useProjectStore((s) => s.addYear);
  const { containerRef, handleAdd } = useFocusOnAdd(project.students.length);
  const [query, setQuery] = useState("");

  const subgroupCount = project.students.reduce(
    (a, y) => a + y.groups.reduce((b, g) => b + g.subgroups.length, 0),
    0
  );
  const totalStudents = project.students.reduce(
    (a, y) => a + (y.numberOfStudents || 0),
    0
  );

  // Match against any level so searching a subgroup keeps its year visible.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return project.students;
    return project.students.filter((y) => {
      if (y.name.toLowerCase().includes(q)) return true;
      return y.groups.some(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.subgroups.some((sg) => sg.name.toLowerCase().includes(q))
      );
    });
  }, [project.students, query]);

  // Big imported projects open collapsed; a fresh one opens ready to edit.
  const collapseByDefault = project.students.length > 2;

  return (
    <div>
      <StepHeader
        title="Students"
        description="Students are organised as Year → Group → Subgroup. Only subgroups are actually scheduled, so every group needs at least one."
        icon={<GraduationCap className="h-4 w-4" />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
        <span className="font-medium text-foreground">Year 1</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">Year 1 A</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
          Year 1 A.1
        </span>
        <span className="text-muted-foreground">
          — the subgroup is what you attach to an activity.
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Years</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.students.length}{" "}
              {project.students.length === 1 ? "year" : "years"} ·{" "}
              {subgroupCount}{" "}
              {subgroupCount === 1 ? "subgroup" : "subgroups"} ·{" "}
              {totalStudents} students
              {query && ` · ${visible.length} matching`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {project.students.length > 2 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search years, groups, subgroups…"
                  className="h-8 w-56 rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <AddButton onClick={() => handleAdd(addYear)} label="Add year" />
          </div>
        </div>
        <div ref={containerRef} className="space-y-2 p-4">
          {project.students.length === 0 ? (
            <EmptyRow
              message="No students yet. Adding a year also creates its first group and subgroup, ready to rename."
              action={
                <AddButton onClick={() => handleAdd(addYear)} label="Add year" />
              }
            />
          ) : visible.length === 0 ? (
            <EmptyRow message={`Nothing matches “${query}”.`} />
          ) : (
            visible.map((y) => (
              <YearCard
                key={y.id}
                yearId={y.id}
                defaultOpen={!collapseByDefault || Boolean(query)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function YearCard({
  yearId,
  defaultOpen,
}: {
  yearId: string;
  defaultOpen: boolean;
}) {
  const project = useProjectStore((s) => s.project)!;
  const year = project.students.find((y) => y.id === yearId);
  const updateYear = useProjectStore((s) => s.updateYear);
  const removeYear = useProjectStore((s) => s.removeYear);
  const addGroup = useProjectStore((s) => s.addGroup);
  const [open, setOpen] = useState(defaultOpen);

  if (!year) return null;

  const subgroupTotal = year.groups.reduce((n, g) => n + g.subgroups.length, 0);
  const emptyGroups = year.groups.filter((g) => g.subgroups.length === 0).length;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center gap-2 bg-muted/40 px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex h-8 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Year
        </span>
        <Input
          data-row-input
          value={year.name}
          onChange={(e) => updateYear(yearId, { name: e.target.value })}
          placeholder="e.g. Year 1"
          className="h-8 min-w-[140px] flex-1 font-medium"
        />

        {/* Summary stays visible when collapsed, so a long list can be scanned
            without opening every year. */}
        <span className="shrink-0 text-xs text-muted-foreground">
          {year.groups.length} {year.groups.length === 1 ? "group" : "groups"} ·{" "}
          {subgroupTotal} {subgroupTotal === 1 ? "subgroup" : "subgroups"}
        </span>
        {emptyGroups > 0 && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            title={`${emptyGroups} group(s) have no subgroups and cannot be scheduled`}
          >
            <AlertTriangle className="h-3 w-3" />
            {emptyGroups} empty
          </span>
        )}
        <CountBox
          value={year.numberOfStudents}
          onChange={(v) => updateYear(yearId, { numberOfStudents: v })}
          title="Students in this year"
        />
        <button
          onClick={() => addGroup(yearId)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-accent"
        >
          <Plus className="h-3 w-3" /> Group
        </button>
        <ConfirmDelete
          title={`Delete "${year.name || "this year"}"?`}
          description={`This removes ${year.groups.length} group(s) and ${subgroupTotal} subgroup(s). Any activity using them will lose those students.`}
          onConfirm={() => removeYear(yearId)}
          label="Remove year"
        />
      </div>

      {open && (
        <div className="space-y-1.5 p-2.5">
          {year.groups.length === 0 ? (
            <EmptyRow
              message="No groups in this year yet."
              action={
                <AddButton onClick={() => addGroup(yearId)} label="Add group" />
              }
            />
          ) : (
            year.groups.map((g) => (
              <GroupCard key={g.id} yearId={yearId} groupId={g.id} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function GroupCard({ yearId, groupId }: { yearId: string; groupId: string }) {
  const project = useProjectStore((s) => s.project)!;
  const year = project.students.find((y) => y.id === yearId);
  const group = year?.groups.find((g) => g.id === groupId);
  const updateGroup = useProjectStore((s) => s.updateGroup);
  const removeGroup = useProjectStore((s) => s.removeGroup);
  const addSubgroup = useProjectStore((s) => s.addSubgroup);
  const [open, setOpen] = useState(true);

  if (!group) return null;

  const sum = sumSubgroups(group);
  // Only a real (non-zero) subgroup total can disagree with the group. Imported
  // files legitimately leave every subgroup at 0 and carry the count here.
  const mismatch = sum > 0 && sum !== group.numberOfStudents;

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 px-2.5 py-1.5">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex h-7 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Group
        </span>
        <Input
          value={group.name}
          onChange={(e) => updateGroup(yearId, groupId, { name: e.target.value })}
          placeholder="e.g. Group A"
          className="h-8 min-w-[120px] flex-1"
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {group.subgroups.length}{" "}
          {group.subgroups.length === 1 ? "subgroup" : "subgroups"}
        </span>
        {mismatch && (
          <button
            onClick={() =>
              updateGroup(yearId, groupId, { numberOfStudents: sum })
            }
            title={`Subgroups add up to ${sum}, but this group says ${group.numberOfStudents}. Click to use ${sum}.`}
            className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
          >
            <AlertTriangle className="h-3 w-3" />
            Use {sum}
          </button>
        )}
        <CountBox
          value={group.numberOfStudents}
          onChange={(v) => updateGroup(yearId, groupId, { numberOfStudents: v })}
          title="Students in this group"
        />
        <button
          onClick={() => addSubgroup(yearId, groupId)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium hover:bg-accent"
        >
          <Plus className="h-3 w-3" /> Subgroup
        </button>
        <ConfirmDelete
          title={`Delete "${group.name || "this group"}"?`}
          description={`This removes ${group.subgroups.length} subgroup(s). Any activity using them will lose those students.`}
          onConfirm={() => removeGroup(yearId, groupId)}
          label="Remove group"
        />
      </div>

      {open && (
        <div className="border-t border-border px-2.5 py-2">
          {group.subgroups.length === 0 ? (
            <EmptyRow
              message="This group has no subgroups, so nothing in it can be scheduled."
              action={
                <AddButton
                  onClick={() => addSubgroup(yearId, groupId)}
                  label="Add subgroup"
                />
              }
            />
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {group.subgroups.map((sg) => (
                <SubgroupRow
                  key={sg.id}
                  yearId={yearId}
                  groupId={groupId}
                  sgId={sg.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubgroupRow({
  yearId,
  groupId,
  sgId,
}: {
  yearId: string;
  groupId: string;
  sgId: string;
}) {
  const project = useProjectStore((s) => s.project)!;
  const year = project.students.find((y) => y.id === yearId);
  const group = year?.groups.find((g) => g.id === groupId);
  const sg = group?.subgroups.find((s) => s.id === sgId);
  const updateSubgroup = useProjectStore((s) => s.updateSubgroup);
  const removeSubgroup = useProjectStore((s) => s.removeSubgroup);
  if (!sg) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        Sub
      </span>
      <Input
        value={sg.name}
        onChange={(e) =>
          updateSubgroup(yearId, groupId, sgId, { name: e.target.value })
        }
        placeholder="e.g. 1A.1"
        className="h-7 min-w-0 flex-1 text-xs"
      />
      <CountBox
        value={sg.numberOfStudents}
        onChange={(v) =>
          updateSubgroup(yearId, groupId, sgId, { numberOfStudents: v })
        }
        title="Students in this subgroup"
        small
      />
      <DeleteButton
        onClick={() => removeSubgroup(yearId, groupId, sgId)}
        label="Remove subgroup"
      />
    </div>
  );
}

/** Compact headcount box, labelled by title rather than a wrapping caption. */
function CountBox({
  value,
  onChange,
  title,
  small = false,
}: {
  value: number;
  onChange: (v: number) => void;
  title: string;
  small?: boolean;
}) {
  return (
    <div
      className={cn("shrink-0", small ? "w-14" : "w-20")}
      title={title}
    >
      <NumberInput
        value={value}
        min={0}
        onChange={onChange}
        className={cn("text-right tabular-nums", small ? "h-7 text-xs" : "h-8")}
      />
    </div>
  );
}
