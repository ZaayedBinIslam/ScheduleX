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

  // starts[hourIndex][dayIndex] = every entry beginning in that cell. It is a
  // list because a manual move is allowed to create an overlap; the grid then
  // stacks them in one cell rather than emitting a second <td>, which would
  // push the remaining days one column to the right.
  const starts: TimetableEntry[][][] = hours.map(() => days.map(() => []));

  // blocked[hourIndex][dayIndex] = a multi-hour entry that began in an EARLIER
  // row reaches into this cell, so the row must not render a <td> here at all.
  const blocked: boolean[][] = hours.map(() => days.map(() => false));

  // span[hourIndex][dayIndex] = rows the <td> starting here should cover.
  const span: number[][] = hours.map(() => days.map(() => 1));

  for (const e of filtered) {
    const di = days.indexOf(e.day);
    const hi = hours.indexOf(e.hour);
    if (di < 0 || hi < 0) continue;
    starts[hi][di].push(e);
    // Never span past the end of the day, or the table grows extra rows.
    const rows = Math.max(1, Math.min(e.duration, hours.length - hi));
    span[hi][di] = Math.max(span[hi][di], rows);
    for (let k = 1; k < rows; k++) blocked[hi + k][di] = true;
  }

  // An entry starting inside another entry's span cannot own a <td>. Fold it
  // into the covering cell so the column count per row stays exact.
  for (let hi = 0; hi < hours.length; hi++) {
    for (let di = 0; di < days.length; di++) {
      if (!blocked[hi][di] || starts[hi][di].length === 0) continue;
      const orphans = starts[hi][di];
      starts[hi][di] = [];
      for (let back = hi - 1; back >= 0; back--) {
        if (starts[back][di].length > 0) {
          starts[back][di].push(...orphans);
          break;
        }
      }
    }
  }

  // matrix keeps the old "first entry starting here" shape for callers that
  // only need a quick lookup.
  const matrix: (TimetableEntry | null)[][] = starts.map((row) =>
    row.map((list) => list[0] ?? null)
  );

  return { days, hours, matrix, starts, blocked, span, filtered };
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

// ---------------------------------------------------------------------------
// Drag-and-drop validation: move & swap
// ---------------------------------------------------------------------------

// Check if moving `entry` to (newDay, newHour) — keeping its room — is
// conflict-free. Returns the list of conflicts (empty = ok to move).
export function checkMove(
  project: Project,
  entries: TimetableEntry[],
  entry: TimetableEntry,
  newDay: string,
  newHour: string
): Conflict[] {
  const others = entries.filter((e) => e.activityId !== entry.activityId);
  return findConflicts(project, entry, newDay, newHour, entry.room, others);
}

// Check if swapping entry A with entry B (they exchange day/hour, keeping
// their own rooms) is conflict-free. Returns combined conflicts for both.
export function checkSwap(
  project: Project,
  entries: TimetableEntry[],
  a: TimetableEntry,
  b: TimetableEntry
): Conflict[] {
  const others = entries.filter(
    (e) => e.activityId !== a.activityId && e.activityId !== b.activityId
  );
  // A goes to B's slot, B goes to A's slot.
  const aMoved: TimetableEntry = { ...a, day: b.day, hour: b.hour };
  const bMoved: TimetableEntry = { ...b, day: a.day, hour: a.hour };
  const newEntries = [...others, aMoved, bMoved];
  const ca = findConflicts(project, aMoved, aMoved.day, aMoved.hour, aMoved.room, newEntries);
  const cb = findConflicts(project, bMoved, bMoved.day, bMoved.hour, bMoved.room, newEntries);
  return [...ca, ...cb];
}

// Apply a move: returns a new entries array with the entry relocated.
export function applyMove(
  entries: TimetableEntry[],
  activityId: number,
  newDay: string,
  newHour: string
): TimetableEntry[] {
  return entries.map((e) =>
    e.activityId === activityId ? { ...e, day: newDay, hour: newHour } : e
  );
}

// Apply a swap: returns a new entries array where A and B exchange day/hour.
export function applySwap(
  entries: TimetableEntry[],
  aId: number,
  bId: number
): TimetableEntry[] {
  const a = entries.find((e) => e.activityId === aId);
  const b = entries.find((e) => e.activityId === bId);
  if (!a || !b) return entries;
  return entries.map((e) => {
    if (e.activityId === aId) return { ...e, day: b.day, hour: b.hour };
    if (e.activityId === bId) return { ...e, day: a.day, hour: a.hour };
    return e;
  });
}
