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
  Users,
  ChevronDown,
  Plus,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function StepStudents() {
  const project = useProjectStore((s) => s.project)!;
  const addYear = useProjectStore((s) => s.addYear);

  const subgroupCount = project.students.reduce(
    (a, y) => a + y.groups.reduce((b, g) => b + g.subgroups.length, 0),
    0
  );
  const totalStudents = project.students.reduce(
    (a, y) => a + (y.numberOfStudents || 0),
    0
  );

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
          — the subgroup is what you attach to an activity. Class sizes are
          entered on subgroups; groups and years add themselves up.
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Years</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.students.length}{" "}
              {project.students.length === 1 ? "year" : "years"} ·{" "}
              {subgroupCount}{" "}
              {subgroupCount === 1 ? "subgroup" : "subgroups"} ·{" "}
              {totalStudents} students
            </p>
          </div>
          <AddButton onClick={addYear} label="Add year" />
        </div>
        <div className="space-y-3 p-4">
          {project.students.length === 0 ? (
            <EmptyRow
              message="No students yet. Adding a year also creates its first group and subgroup, ready to rename."
              action={<AddButton onClick={addYear} label="Add year" />}
            />
          ) : (
            project.students.map((y) => (
              <YearCard key={y.id} yearId={y.id} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function YearCard({ yearId }: { yearId: string }) {
  const project = useProjectStore((s) => s.project)!;
  const year = project.students.find((y) => y.id === yearId)!;
  const updateYear = useProjectStore((s) => s.updateYear);
  const removeYear = useProjectStore((s) => s.removeYear);
  const addGroup = useProjectStore((s) => s.addGroup);
  const [open, setOpen] = useState(true);

  const subgroupTotal =
    year?.groups.reduce((n, g) => n + g.subgroups.length, 0) ?? 0;

  if (!year) return null;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-end gap-3 border-b border-border bg-muted/30 px-3 py-2.5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <div className="min-w-[180px] flex-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Year name
          </label>
          <Input
            value={year.name}
            onChange={(e) => updateYear(yearId, { name: e.target.value })}
            placeholder="e.g. Year 1"
            className="h-9"
          />
        </div>
        <DerivedCount
          label="Students"
          value={year.numberOfStudents}
          title="Total of every subgroup in this year"
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => addGroup(yearId)}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-accent"
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
      </div>

      {open && (
        <div className="space-y-2 p-3">
          {year.groups.length === 0 ? (
            <EmptyRow
              message="No groups in this year yet."
              action={
                <AddButton
                  onClick={() => addGroup(yearId)}
                  label="Add group"
                />
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

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-end gap-2 border-b border-border px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <div className="min-w-[140px] flex-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Group name
          </label>
          <Input
            value={group.name}
            onChange={(e) =>
              updateGroup(yearId, groupId, { name: e.target.value })
            }
            placeholder="e.g. Group A"
            className="h-8"
          />
        </div>
        <DerivedCount
          label="Students"
          value={group.numberOfStudents}
          title="Total of every subgroup in this group"
          compact
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => addSubgroup(yearId, groupId)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium hover:bg-accent"
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
      </div>
      {open && (
        <div className="space-y-1.5 p-3">
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
            group.subgroups.map((sg) => {
              return (
                <SubgroupRow
                  key={sg.id}
                  yearId={yearId}
                  groupId={groupId}
                  sgId={sg.id}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A parent's headcount, shown read-only.
 *
 * Group and year totals are summed from their subgroups, so letting them be
 * typed just invites a mismatch between the two numbers.
 */
function DerivedCount({
  label,
  value,
  title,
  compact = false,
}: {
  label: string;
  value: number;
  title: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "w-24" : "w-28"} title={title}>
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center rounded-md border border-dashed border-border bg-muted/40 px-3 text-sm text-muted-foreground",
          compact ? "h-8" : "h-9"
        )}
      >
        {value}
      </div>
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
  if (!sg || !group) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
      )}
    >
      <Users className="h-3.5 w-3.5 self-center text-muted-foreground" />
      <div className="min-w-[140px] flex-1">
        <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Subgroup name
        </label>
        <Input
          value={sg.name}
          onChange={(e) =>
            updateSubgroup(yearId, groupId, sgId, { name: e.target.value })
          }
          placeholder="e.g. 1A.1"
          className="h-8"
        />
      </div>
      <div className="w-24">
        <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          # Students
        </label>
        <NumberInput
          value={sg.numberOfStudents}
          onChange={(v) =>
            updateSubgroup(yearId, groupId, sgId, { numberOfStudents: v })
          }
          min={0}
          className="h-8"
        />
      </div>
      <DeleteButton
        onClick={() => removeSubgroup(yearId, groupId, sgId)}
        label="Remove subgroup"
      />
    </div>
  );
}
