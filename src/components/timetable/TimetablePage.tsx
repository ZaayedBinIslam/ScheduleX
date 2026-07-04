"use client";

import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/lib/store";
import { saveTimetable, exportProjectUrl } from "@/lib/api";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  CalendarClock,
  Users,
  DoorOpen,
  GraduationCap,
  LayoutGrid,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import {
  buildMatrix,
  findConflicts,
  occupancyStats,
  roomResources,
  studentResources,
  subjectColor,
  teacherResources,
  type Conflict,
} from "@/lib/fet/timetable-utils";
import type { TimetableEntry } from "@/lib/fet/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewKind = "teacher" | "room" | "student";

export function TimetablePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.project);
  const save = useProjectStore((s) => s.save);
  const dirty = useProjectStore((s) => s.dirty);

  const [view, setView] = useState<ViewKind>("teacher");
  const [resourceId, setResourceId] = useState<string>("");
  const [editing, setEditing] = useState<TimetableEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const entries = project?.timetable?.entries ?? [];

  const resources = useMemo(() => {
    if (!project) return [];
    if (view === "teacher") return teacherResources(project);
    if (view === "room") return roomResources(project);
    return studentResources(project);
  }, [project, view]);

  // Keep a valid resource selected when view changes.
  const currentResource =
    resourceId && resources.some((r) => r.id === resourceId)
      ? resourceId
      : resources[0]?.id ?? "";

  const matrix = useMemo(() => {
    if (!project) return null;
    return buildMatrix(
      project,
      entries,
      currentResource
        ? { kind: view, id: currentResource }
        : null
    );
  }, [project, entries, view, currentResource]);

  if (!project) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!project.timetable || entries.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">No timetable yet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a timetable first to view and edit it here.
        </p>
        <Button
          className="mt-5 gap-1.5"
          onClick={() => navigate(`/project/${id}/generate`)}
        >
          <Sparkles className="h-4 w-4" />
          Generate timetable
        </Button>
      </div>
    );
  }

  const stats = occupancyStats(project, entries);

  const onMove = (entry: TimetableEntry, day: string, hour: string, room: string) => {
    const conflicts = findConflicts(
      project,
      entry,
      day,
      hour,
      room,
      entries
    );
    // Apply the move regardless (we surface conflicts as warnings).
    const newEntries = entries.map((e) =>
      e.activityId === entry.activityId
        ? { ...e, day, hour, room }
        : e
    );
    useProjectStore.getState().setTimetable({
      ...project.timetable!,
      entries: newEntries,
      warnings: conflicts.length
        ? [
            ...project.timetable!.warnings,
            `Manual move of #${entry.activityId}: ${conflicts.map((c) => c.message).join("; ")}`,
          ]
        : project.timetable!.warnings,
    });
    setEditing(null);
  };

  const onSave = async () => {
    if (!project.timetable) return;
    setSaving(true);
    try {
      await saveTimetable(project, project.timetable);
    } finally {
      setSaving(false);
    }
  };

  const onExport = () => {
    if (!project.timetable) return;
    const rows = [["ActivityId", "Day", "Hour", "Room", "Subject", "Teachers", "Students", "Duration"]];
    for (const e of project.timetable.entries) {
      rows.push([
        String(e.activityId),
        e.day,
        e.hour,
        e.room,
        e.subjectName,
        e.teacherNames.join("|"),
        e.studentNames.join("|"),
        String(e.duration),
      ]);
    }
    const csv = rows
      .map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name || "timetable"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <button
            onClick={() => navigate(`/project/${id}`)}
            className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Timetable</h1>
            <p className="text-sm text-muted-foreground">
              {project.name} · {project.timetable.engine === "fet" ? "FET" : "Fallback"} ·{" "}
              {new Date(project.timetable.generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={exportProjectUrl(project.id)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
            title="Download the .fet source file for this project"
          >
            <Download className="h-3.5 w-3.5" />
            .fet
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/project/${id}/generate`)}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Regenerate
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!dirty || saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save changes
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={<CalendarClock className="h-4 w-4" />}
          label="Scheduled"
          value={`${entries.length} / ${project.activities.filter((a) => a.active).length}`}
        />
        <StatTile
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Utilization"
          value={`${stats.utilization}%`}
        />
        <StatTile
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Unassigned"
          value={String(project.timetable.unassigned.length)}
          danger={project.timetable.unassigned.length > 0}
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Warnings"
          value={String(project.timetable.warnings.length)}
          danger={project.timetable.warnings.length > 0}
        />
      </div>

      {/* View selector + resource */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <Tabs value={view} onValueChange={(v) => { setView(v as ViewKind); setResourceId(""); }}>
          <TabsList>
            <TabsTrigger value="teacher" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Teacher
            </TabsTrigger>
            <TabsTrigger value="room" className="gap-1.5">
              <DoorOpen className="h-3.5 w-3.5" /> Room
            </TabsTrigger>
            <TabsTrigger value="student" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Students
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">View:</span>
          <Select
            value={currentResource}
            onValueChange={(v) => setResourceId(v)}
          >
            <SelectTrigger className="h-9 w-56">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {resources.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Matrix */}
      {matrix && currentResource ? (
        <TimetableMatrix
          matrix={matrix}
          onEdit={(e) => setEditing(e)}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {resources.length === 0
            ? `No ${view} resources to display.`
            : "Select a resource above to view its timetable."}
        </div>
      )}

      {/* Unassigned list */}
      {project.timetable.unassigned.length > 0 && (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Unassigned activities ({project.timetable.unassigned.length})
          </h3>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {project.timetable.unassigned.map((u) => (
              <li key={u.activityId} className="text-muted-foreground">
                Activity #{u.activityId} — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Edit dialog */}
      {editing && (
        <EditDialog
          entry={editing}
          project={project}
          entries={entries}
          onClose={() => setEditing(null)}
          onApply={onMove}
        />
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide",
          danger ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          danger && "text-destructive"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function TimetableMatrix({
  matrix,
  onEdit,
}: {
  matrix: ReturnType<typeof buildMatrix>;
  onEdit: (e: TimetableEntry) => void;
}) {
  const { days, hours, matrix: cells, covered } = matrix;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[80px] border-b border-r border-border bg-muted/60 px-3 py-2 text-left font-medium text-muted-foreground">
              Time
            </th>
            {days.map((d) => (
              <th
                key={d}
                className="min-w-[150px] border-b border-r border-border bg-muted/60 px-3 py-2 text-center font-semibold last:border-r-0"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((h, hi) => (
            <tr key={h}>
              <td className="sticky left-0 z-10 border-b border-r border-border bg-muted/30 px-3 py-2 font-medium text-muted-foreground">
                {h}
              </td>
              {days.map((d, di) => {
                const entry = cells[hi][di];
                const coveredBy = covered[hi][di];
                if (!entry && !coveredBy) {
                  return (
                    <td
                      key={d}
                      className="border-b border-r border-border p-1 last:border-r-0"
                    >
                      <div className="h-14 rounded-md border border-dashed border-border/60" />
                    </td>
                  );
                }
                if (entry) {
                  return (
                    <td
                      key={d}
                      className="border-b border-r border-border p-1 align-top last:border-r-0"
                      rowSpan={entry.duration}
                    >
                      <ActivityCell entry={entry} onClick={() => onEdit(entry)} />
                    </td>
                  );
                }
                // covered by a multi-hour entry above
                return null;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityCell({
  entry,
  onClick,
}: {
  entry: TimetableEntry;
  onClick: () => void;
}) {
  const color = subjectColor(entry.subjectName);
  return (
    <button
      onClick={onClick}
      className="group flex h-full w-full flex-col rounded-md border-l-4 p-2 text-left transition-shadow hover:shadow-md"
      style={{
        borderLeftColor: color,
        backgroundColor: `${color}14`,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-semibold leading-tight">
          {entry.subjectName || "(no subject)"}
        </span>
        <Pencil className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      </div>
      {entry.teacherNames.length > 0 && (
        <span className="mt-0.5 text-[10px] text-muted-foreground">
          {entry.teacherNames.join(", ")}
        </span>
      )}
      {entry.room && (
        <span className="text-[10px] text-muted-foreground">
          📍 {entry.room}
        </span>
      )}
      {entry.studentNames.length > 0 && (
        <span className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
          {entry.studentNames.join(", ")}
        </span>
      )}
      <span className="mt-auto pt-1 text-[9px] uppercase tracking-wide text-muted-foreground/70">
        #{entry.activityId} · {entry.duration}h
      </span>
    </button>
  );
}

function EditDialog({
  entry,
  project,
  entries,
  onClose,
  onApply,
}: {
  entry: TimetableEntry;
  project: ReturnType<typeof useProjectStore.getState>["project"];
  entries: TimetableEntry[];
  onClose: () => void;
  onApply: (entry: TimetableEntry, day: string, hour: string, room: string) => void;
}) {
  const [day, setDay] = useState(entry.day);
  const [hour, setHour] = useState(entry.hour);
  const [room, setRoom] = useState(entry.room);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const recompute = (d: string, h: string, r: string) => {
    if (!project) return;
    setConflicts(findConflicts(project, entry, d, h, r, entries));
  };

  const realRooms = project?.rooms.filter((r) => !r.virtual) ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit activity #{entry.activityId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{entry.subjectName || "(no subject)"}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {entry.teacherNames.join(", ")} · {entry.studentNames.join(", ")}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Day</label>
              <Select
                value={day}
                onValueChange={(v) => {
                  setDay(v);
                  recompute(v, hour, room);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {project?.days.map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Start hour
              </label>
              <Select
                value={hour}
                onValueChange={(v) => {
                  setHour(v);
                  recompute(day, v, room);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {project?.hours.map((h) => (
                    <SelectItem
                      key={h.name}
                      value={h.name}
                      disabled={
                        project.hours.indexOf(h.name) + entry.duration >
                        project.hours.length
                      }
                    >
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Room
              </label>
              <Select
                value={room === "" ? "__none__" : room}
                onValueChange={(v) => {
                  const next = v === "__none__" ? "" : v;
                  setRoom(next);
                  recompute(day, hour, next);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="No room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(no room)</SelectItem>
                  {realRooms.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name} · cap {r.capacity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conflicts */}
          {conflicts.length > 0 ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {conflicts.length} conflict(s) at this slot
              </div>
              <ul className="mt-1.5 space-y-0.5 text-xs text-destructive">
                {conflicts.map((c, i) => (
                  <li key={i}>• {c.message}</li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">
                You can still apply the move — conflicts will be recorded as
                warnings.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              No conflicts at this slot.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button onClick={() => onApply(entry, day, hour, room)}>
            Apply move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
