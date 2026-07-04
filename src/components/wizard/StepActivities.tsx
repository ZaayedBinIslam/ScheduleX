"use client";

import { useProjectStore } from "@/lib/store";
import {
  StepHeader,
  AddButton,
  DeleteButton,
  EmptyRow,
  NumberInput,
  Field,
} from "./shared";
import { Input, Textarea, Switch, Label, Badge } from "@/components/ui";
import { MultiSelect, SingleSelect } from "./MultiSelect";
import { ListChecks, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { activityStudentCount, studentSetName } from "@/lib/fet/resolve";
import type { Activity } from "@/lib/fet/types";

export function StepActivities() {
  const project = useProjectStore((s) => s.project)!;
  const addActivity = useProjectStore((s) => s.addActivity);
  const removeActivity = useProjectStore((s) => s.removeActivity);

  return (
    <div>
      <StepHeader
        title="Activities"
        description="An activity is one teaching unit: a subject taught by one or more teachers to one or more student sets, for a number of periods. Add one row per scheduled session."
        icon={<ListChecks className="h-4 w-4" />}
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Activities</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.activities.length} total ·{" "}
              {project.activities.filter((a) => a.active).length} active
            </p>
          </div>
          <AddButton onClick={() => addActivity()} label="Add activity" />
        </div>
        <div className="space-y-2 p-4">
          {project.activities.length === 0 ? (
            <EmptyRow
              message="No activities yet. An activity links a teacher + subject + students."
              action={<AddButton onClick={() => addActivity()} label="Add activity" />}
            />
          ) : (
            project.activities.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))
          )}
        </div>
      </div>

      {project.activities.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Split activities:</strong> To
          teach a 4-period subject across 2 sessions, create 2 activities with
          the same <em>Activity group id</em> (e.g. 1) and duration 2 each. FET
          will keep them on different days where possible.
        </div>
      )}
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const project = useProjectStore((s) => s.project)!;
  const updateActivity = useProjectStore((s) => s.updateActivity);
  const removeActivity = useProjectStore((s) => s.removeActivity);
  const addActivity = useProjectStore((s) => s.addActivity);
  const [open, setOpen] = useState(false);

  const teacherOptions = project.teachers.map((t) => ({
    value: t.id,
    label: t.name || "(unnamed)",
  }));
  const subjectOptions = project.subjects.map((s) => ({
    value: s.id,
    label: s.name || "(unnamed)",
  }));
  const tagOptions = project.activityTags.map((t) => ({
    value: t.id,
    label: t.name || "(unnamed)",
  }));
  const studentOptions = project.students.flatMap((y) => [
    { value: y.id, label: `${y.name || "(year)"}  ·  whole year` },
    ...y.groups.map((g) => ({
      value: g.id,
      label: `  └ ${g.name || "(group)"}  ·  group`,
    })),
    ...y.groups.flatMap((g) =>
      g.subgroups.map((sg) => ({
        value: sg.id,
        label: `      · ${sg.name || "(subgroup)"}  ·  subgroup`,
      }))
    ),
  ]);

  const subjName =
    project.subjects.find((s) => s.id === activity.subject)?.name ?? "(no subject)";
  const teacherLabel =
    activity.teachers
      .map((id) => project.teachers.find((t) => t.id === id)?.name)
      .filter(Boolean)
      .join(", ") || "(no teacher)";
  const studentCount = activityStudentCount(project, activity);

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-7 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <Badge variant="outline" className="font-mono">
          #{activity.id}
        </Badge>
        <span className="font-medium">{subjName}</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="truncate text-xs text-muted-foreground">
          {teacherLabel}
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">
          {activity.duration}h · {studentCount} students
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => {
              const newId = addActivity({
                teachers: activity.teachers,
                subject: activity.subject,
                activityTags: activity.activityTags,
                students: activity.students,
                duration: activity.duration,
                totalDuration: activity.totalDuration,
                activityGroupId: activity.activityGroupId,
                isSplit: activity.isSplit,
                comments: activity.comments,
              });
              void newId;
            }}
            title="Duplicate"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <DeleteButton onClick={() => removeActivity(activity.id)} />
        </div>
      </div>

      {open && (
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
          <Field label="Teachers">
            <MultiSelect
              options={teacherOptions}
              value={activity.teachers}
              onChange={(v) => updateActivity(activity.id, { teachers: v })}
              placeholder="Select teachers"
              emptyText="Add teachers in step 3 first."
            />
          </Field>
          <Field label="Subject">
            <SingleSelect
              options={subjectOptions}
              value={activity.subject}
              onChange={(v) => updateActivity(activity.id, { subject: v })}
              placeholder="Select subject"
            />
          </Field>
          <Field label="Activity tags">
            <MultiSelect
              options={tagOptions}
              value={activity.activityTags}
              onChange={(v) =>
                updateActivity(activity.id, { activityTags: v })
              }
              placeholder="Optional tags"
              emptyText="Add activity tags in step 4 first."
            />
          </Field>
          <Field label="Students (year / group / subgroup)">
            <MultiSelect
              options={studentOptions}
              value={activity.students}
              onChange={(v) => updateActivity(activity.id, { students: v })}
              placeholder="Select student sets"
              emptyText="Add students in step 5 first."
            />
          </Field>
          <Field label="Duration (periods)" hint="How many consecutive hours this activity takes.">
            <NumberInput
              value={activity.duration}
              min={1}
              max={Math.max(1, project.hours.length)}
              onChange={(v) => {
                const nv = Math.max(1, v);
                updateActivity(activity.id, {
                  duration: nv,
                  totalDuration: Math.max(nv, activity.totalDuration),
                });
              }}
            />
          </Field>
          <Field label="Activity group id" hint="Same id = split parts of one logical activity. 0 = not split.">
            <NumberInput
              value={activity.activityGroupId}
              min={0}
              onChange={(v) =>
                updateActivity(activity.id, {
                  activityGroupId: v,
                  isSplit: v > 0,
                })
              }
            />
          </Field>
          <Field label="Total duration" hint="Sum of all split parts. Usually = duration if not split.">
            <NumberInput
              value={activity.totalDuration}
              min={1}
              onChange={(v) =>
                updateActivity(activity.id, { totalDuration: Math.max(1, v) })
              }
            />
          </Field>
          <Field label="Status">
            <div className="flex items-center gap-2">
              <Switch
                id={`active-${activity.id}`}
                checked={activity.active}
                onCheckedChange={(c) =>
                  updateActivity(activity.id, { active: c })
                }
              />
              <Label htmlFor={`active-${activity.id}`} className="text-sm">
                {activity.active ? "Active (scheduled)" : "Inactive (skipped)"}
              </Label>
            </div>
          </Field>
          <Field label="Comments" className="sm:col-span-2">
            <Textarea
              value={activity.comments}
              onChange={(e) =>
                updateActivity(activity.id, { comments: e.target.value })
              }
              rows={2}
              placeholder="Optional notes for this activity"
            />
          </Field>
          {activity.students.length > 0 && (
            <div className="sm:col-span-2 flex flex-wrap gap-1.5">
              {activity.students.map((sid) => (
                <Badge key={sid} variant="secondary" className="text-[11px]">
                  {studentSetName(project, sid)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
