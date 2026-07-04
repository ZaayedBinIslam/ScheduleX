import type { Project, TimetableEntry } from "@/lib/fet/types";

export interface Conflict {
  type: "teacher" | "student" | "room";
  withActivityId: number;
  message: string;
}

// Check whether moving/placing an entry at a given day/hour/room conflicts
// with any OTHER entry in the timetable (for the same teacher/student/room).
export function findConflicts(
  project: Project,
  entry: TimetableEntry,
  newDay: string,
  newHour: string,
  newRoom: string,
  entries: TimetableEntry[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  const dayNames = project.days.map((d) => d.name);
  const hourNames = project.hours.map((h) => h.name);
  const startIdx = hourNames.indexOf(newHour);
  const endIdx = startIdx + entry.duration;

  const slotsOverlap = (
    e: TimetableEntry
  ): boolean => {
    const eStart = hourNames.indexOf(e.hour);
    const eEnd = eStart + e.duration;
    return e.day === newDay && eStart < endIdx && startIdx < eEnd;
  };

  for (const other of entries) {
    if (other.activityId === entry.activityId) continue;
    if (!slotsOverlap(other)) continue;
    // teacher conflict
    const sharedTeacher = other.teacherIds.some((t) =>
      entry.teacherIds.includes(t)
    );
    if (sharedTeacher) {
      conflicts.push({
        type: "teacher",
        withActivityId: other.activityId,
        message: `Teacher clash with activity #${other.activityId} (${other.subjectName})`,
      });
    }
    // student conflict
    const sharedStudent = other.studentIds.some((s) =>
      entry.studentIds.includes(s)
    );
    if (sharedStudent) {
      conflicts.push({
        type: "student",
        withActivityId: other.activityId,
        message: `Student clash with activity #${other.activityId} (${other.subjectName})`,
      });
    }
    // room conflict
    if (newRoom && other.room && newRoom === other.room) {
      conflicts.push({
        type: "room",
        withActivityId: other.activityId,
        message: `Room clash: ${newRoom} used by activity #${other.activityId} (${other.subjectName})`,
      });
    }
  }
  void dayNames;
  return conflicts;
}

// Build a matrix for a given resource (teacher/room/student filter).
// Returns rows=hours, cols=days, cells = entries.
export function buildMatrix(
  project: Project,
  entries: TimetableEntry[],
  filter: { kind: "teacher" | "room" | "student"; id: string } | null
) {
  const days = project.days.map((d) => d.name);
  const hours = project.hours.map((h) => h.name);

  const filtered = filter
    ? entries.filter((e) => {
        if (filter.kind === "teacher") return e.teacherIds.includes(filter.id);
        if (filter.kind === "room") return e.room === filter.id; // by name match
        if (filter.kind === "student") return e.studentIds.includes(filter.id);
        return true;
      })
    : entries;

  // matrix[hourIndex][dayIndex] = entry that starts there (or null)
  const matrix: (TimetableEntry | null)[][] = hours.map(() =>
    days.map(() => null)
  );
  // covered[hourIndex][dayIndex] = entry id that spans into this cell (for multi-hour)
  const covered: (number | null)[][] = hours.map(() =>
    days.map(() => null)
  );

  for (const e of filtered) {
    const di = days.indexOf(e.day);
    const hi = hours.indexOf(e.hour);
    if (di < 0 || hi < 0) continue;
    matrix[hi][di] = e;
    for (let k = 0; k < e.duration; k++) {
      if (hi + k < hours.length) covered[hi + k][di] = e.activityId;
    }
  }

  return { days, hours, matrix, covered, filtered };
}

// Resource lists for the view selector.
export function teacherResources(project: Project) {
  return project.teachers.map((t) => ({ id: t.id, label: t.name }));
}
export function roomResources(project: Project) {
  return project.rooms
    .filter((r) => !r.virtual)
    .map((r) => ({ id: r.name, label: r.name }));
}
export function studentResources(project: Project) {
  return project.students.flatMap((y) => [
    { id: y.id, label: `${y.name} (year)` },
    ...y.groups.map((g) => ({ id: g.id, label: `${g.name} (group)` })),
    ...y.groups.flatMap((g) =>
      g.subgroups.map((sg) => ({ id: sg.id, label: sg.name }))
    ),
  ]);
}

// Distinct colors for subjects (stable hash).
const PALETTE = [
  "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#84cc16", "#f97316", "#6366f1",
  "#06b6d4", "#adfa1d", "#fb7185", "#a3e635", "#facc15",
  "#22d3ee", "#c084fc", "#fb923c",
];

export function subjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

// Human readable occupancy stats.
export function occupancyStats(
  project: Project,
  entries: TimetableEntry[]
) {
  const totalSlots = project.days.length * project.hours.length;
  const usedSlots = entries.reduce((acc, e) => acc + e.duration, 0);
  return {
    totalSlots,
    usedSlots,
    utilization: totalSlots ? Math.round((usedSlots / totalSlots) * 100) : 0,
  };
}
