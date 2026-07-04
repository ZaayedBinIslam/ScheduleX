"use client";

import { useProjectStore } from "@/lib/store";
import {
  StepHeader,
  AddButton,
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
  const removeYear = useProjectStore((s) => s.removeYear);
  const updateYear = useProjectStore((s) => s.updateYear);

  const subgroupCount = project.students.reduce(
    (a, y) => a + y.groups.reduce((b, g) => b + g.subgroups.length, 0),
    0
  );

  return (
    <div>
      <StepHeader
        title="Students (Years › Groups › Subgroups)"
        description="FET models students as a hierarchy: Year → Group → Subgroup. Subgroups are the atomic units that get scheduled (they can be shared across activities)."
        icon={<GraduationCap className="h-4 w-4" />}
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Years</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.students.length} year(s) · {subgroupCount} subgroup(s)
              total
            </p>
          </div>
          <AddButton onClick={addYear} label="Add year" />
        </div>
        <div className="space-y-3 p-4">
          {project.students.length === 0 ? (
            <EmptyRow
              message="No students yet. Add a year (e.g. Year 1), then groups and subgroups inside it."
              action={<AddButton onClick={addYear} label="Add year" />}
            />
          ) : (
            project.students.map((y) => (
              <YearCard key={y.id} yearId={y.id} />
            ))
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Example:</strong> Year 1 → Group 1A,
        Group 1B → Subgroup 1A.1, 1A.2 … Each subgroup is the smallest set that
        can be taught independently.
      </div>
      {/* keep updateYear/removeYear referenced for clarity */}
      <span className="hidden">
        {String(Boolean(updateYear))}{String(Boolean(removeYear))}
      </span>
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
        <div className="w-28">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            # Students
          </label>
          <NumberInput
            value={year.numberOfStudents}
            onChange={(v) => updateYear(yearId, { numberOfStudents: v })}
            min={0}
            className="h-9"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => addGroup(yearId)}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-accent"
          >
            <Plus className="h-3 w-3" /> Group
          </button>
          <DeleteButton onClick={() => removeYear(yearId)} label="Remove year" />
        </div>
      </div>

      {open && (
        <div className="space-y-2 p-3">
          {year.groups.length === 0 ? (
            <EmptyRow
              message="No groups in this year."
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
        <div className="w-24">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            # Students
          </label>
          <NumberInput
            value={group.numberOfStudents}
            onChange={(v) =>
              updateGroup(yearId, groupId, { numberOfStudents: v })
            }
            min={0}
            className="h-8"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => addSubgroup(yearId, groupId)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium hover:bg-accent"
          >
            <Plus className="h-3 w-3" /> Subgroup
          </button>
          <DeleteButton onClick={() => removeGroup(yearId, groupId)} label="Remove group" />
        </div>
      </div>
      {open && (
        <div className="space-y-1.5 p-3">
          {group.subgroups.length === 0 ? (
            <EmptyRow
              message="No subgroups yet. Add at least one subgroup (the atomic scheduling unit)."
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
