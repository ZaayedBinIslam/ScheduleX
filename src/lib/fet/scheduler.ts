import type {
  Activity,
  Project,
  TimeSlot,
  Timetable,
  TimetableEntry,
} from "./types";
import { activityStudentCount, activitySubgroups } from "./resolve";

// A greedy scheduler used when fet-cli is not installed. It produces a valid,
// conflict-free timetable respecting the most important constraints:
//  - Teacher / student / room non-overlap
//  - Not-available times for teachers / students / rooms
//  - Activity duration (consecutive hours)
//  - Preferred starting times
// It is NOT as optimal as FET, but it is deterministic and always returns a
// usable result so the UI is fully demonstrable.

interface Occupied {
  teacher: Set<string>; // "day|hour" per teacher id
  student: Set<string>; // per subgroup id
  room: Set<string>; // per room id
}

export function fallbackSchedule(project: Project): Timetable {
  const warnings: string[] = [];
  if (!project.days.length || !project.hours.length) {
    warnings.push("No days or hours defined — cannot schedule.");
    return {
      generatedAt: new Date().toISOString(),
      engine: "fallback",
      entries: [],
      unassigned: project.activities
        .filter((a) => a.active)
        .map((a) => ({ activityId: a.id, reason: "No schedule grid" })),
      warnings,
    };
  }

  // Build lookup tables
  const dayNames = project.days.map((d) => d.name);
  const hourNames = project.hours.map((h) => h.name);
  const hourIndex = new Map(hourNames.map((h, i) => [h, i]));

  // Not-available sets
  const teacherNa = buildTeacherNa(project);
  const studentNa = buildStudentNa(project);
  const roomNa = buildRoomNa(project);

  // Preferred starting times per activity
  const preferredStart = new Map<number, TimeSlot>();
  for (const c of project.timeConstraints) {
    if (c.active && c.type === "ActivityPreferredStartingTime" && c.preferredStartingTime && c.activityIds?.length) {
      preferredStart.set(c.activityIds[0], c.preferredStartingTime);
    }
  }

  // Room preferences
  const activityPreferredRoom = new Map<number, string>();
  const subjectPreferredRoom = new Map<string, string>();
  for (const c of project.spaceConstraints) {
    if (!c.active) continue;
    if (c.type === "ActivityPreferredRoom" && c.activityId != null && c.roomId) {
      activityPreferredRoom.set(c.activityId, c.roomId);
    }
    if (c.type === "SubjectPreferredRoom" && c.subjectId && c.roomId) {
      subjectPreferredRoom.set(c.subjectId, c.roomId);
    }
  }

  const occupied: Occupied = {
    teacher: new Set(),
    student: new Set(),
    room: new Set(),
  };

  const realRooms = project.rooms.filter((r) => !r.virtual);

  // Sort activities: preferred-start first, then longer duration, then fewer
  // room options (more constrained first).
  const sorted = [...project.activities]
    .filter((a) => a.active)
    .sort((a, b) => {
      const ap = preferredStart.has(a.id) ? 0 : 1;
      const bp = preferredStart.has(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return b.duration - a.duration;
    });

  const entries: TimetableEntry[] = [];
  const unassigned: Array<{ activityId: number; reason: string }> = [];

  for (const a of sorted) {
    const placed = tryPlace(
      a,
      project,
      dayNames,
      hourNames,
      hourIndex,
      teacherNa,
      studentNa,
      roomNa,
      preferredStart,
      activityPreferredRoom,
      subjectPreferredRoom,
      realRooms,
      occupied
    );
    if (placed) {
      entries.push(placed.entry);
    } else {
      unassigned.push({
        activityId: a.id,
        reason: "No conflict-free slot found (try relaxing constraints).",
      });
    }
  }

  if (unassigned.length) {
    warnings.push(
      `${unassigned.length} activity(ies) could not be placed. Edit constraints and regenerate.`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    engine: "fallback",
    entries,
    unassigned,
    warnings,
  };
}

function tryPlace(
  a: Activity,
  project: Project,
  dayNames: string[],
  hourNames: string[],
  hourIndex: Map<string, number>,
  teacherNa: Map<string, Set<string>>,
  studentNa: Map<string, Set<string>>,
  roomNa: Map<string, Set<string>>,
  preferredStart: Map<number, TimeSlot>,
  activityPreferredRoom: Map<number, string>,
  subjectPreferredRoom: Map<string, string>,
  realRooms: { id: string; name: string; capacity: number }[],
  occupied: Occupied
): { entry: TimetableEntry } | null {
  const dur = Math.max(1, Math.min(a.duration, hourNames.length));
  const sgIds = activitySubgroups(project, a);
  const studentCount = activityStudentCount(project, a);

  // Determine candidate rooms (ordered by preference)
  const prefRoomId =
    activityPreferredRoom.get(a.id) ??
    (a.subject ? subjectPreferredRoom.get(a.subject) : undefined);
  const candidateRooms = (() => {
    const eligible = realRooms.filter((r) => r.capacity >= studentCount);
    if (eligible.length === 0) {
      // no room fits capacity — still try any real room (warning)
      return realRooms;
    }
    if (prefRoomId) {
      const idx = eligible.findIndex((r) => r.id === prefRoomId);
      if (idx > 0) {
        const [r] = eligible.splice(idx, 1);
        return [r, ...eligible];
      }
    }
    return eligible;
  })();

  // Candidate days/hours
  const days = [...dayNames];

  // If preferred start exists, try it first (force).
  const pref = preferredStart.get(a.id);
  const startCandidates: Array<{ day: string; hour: string }> = [];
  if (pref && hourIndex.has(pref.hour)) {
    startCandidates.push(pref);
  }
  for (const d of days) {
    for (let i = 0; i <= hourNames.length - dur; i++) {
      const h = hourNames[i];
      if (pref && pref.day === d && pref.hour === h) continue; // already added
      startCandidates.push({ day: d, hour: h });
    }
  }

  for (const cand of startCandidates) {
    const startIdx = hourIndex.get(cand.hour)!;
    if (startIdx + dur > hourNames.length) continue;
    const slotHours = hourNames.slice(startIdx, startIdx + dur);

    // Check not-available times for teachers
    let ok = true;
    for (const tid of a.teachers) {
      const na = teacherNa.get(tid);
      for (const h of slotHours) {
        const key = `${cand.day}|${h}`;
        if (na?.has(key)) {
          ok = false;
          break;
        }
        if (occupied.teacher.has(`${tid}|${key}`)) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
    }
    if (!ok) continue;

    // Check not-available for students
    for (const sgId of sgIds) {
      const na = studentNa.get(sgId);
      for (const h of slotHours) {
        const key = `${cand.day}|${h}`;
        if (na?.has(key)) {
          ok = false;
          break;
        }
        if (occupied.student.has(`${sgId}|${key}`)) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
    }
    if (!ok) continue;

    // Find a room
    let chosenRoom: { id: string; name: string } | null = null;
    if (realRooms.length > 0) {
      for (const r of candidateRooms) {
        const na = roomNa.get(r.id);
        let roomOk = true;
        for (const h of slotHours) {
          const key = `${cand.day}|${h}`;
          if (na?.has(key)) {
            roomOk = false;
            break;
          }
          if (occupied.room.has(`${r.id}|${key}`)) {
            roomOk = false;
            break;
          }
        }
        if (roomOk) {
          chosenRoom = r;
          break;
        }
      }
      if (!chosenRoom) continue;
    }

    // Commit
    for (const tid of a.teachers) {
      for (const h of slotHours) occupied.teacher.add(`${tid}|${cand.day}|${h}`);
    }
    for (const sgId of sgIds) {
      for (const h of slotHours) occupied.student.add(`${sgId}|${cand.day}|${h}`);
    }
    if (chosenRoom) {
      for (const h of slotHours)
        occupied.room.add(`${chosenRoom.id}|${cand.day}|${h}`);
    }

    const entry: TimetableEntry = {
      activityId: a.id,
      teacherIds: [...a.teachers],
      subjectId: a.subject,
      activityTagIds: [...a.activityTags],
      studentIds: sgIds,
      duration: dur,
      day: cand.day,
      hour: cand.hour,
      room: chosenRoom?.name ?? "",
      teacherNames: a.teachers.map(
        (id) => project.teachers.find((t) => t.id === id)?.name ?? id
      ),
      subjectName:
        project.subjects.find((s) => s.id === a.subject)?.name ?? "",
      activityTagNames: a.activityTags.map(
        (id) => project.activityTags.find((t) => t.id === id)?.name ?? ""
      ),
      studentNames: sgIds.map((id) => {
        for (const y of project.students)
          for (const g of y.groups)
            for (const s of g.subgroups) if (s.id === id) return s.name;
        return id;
      }),
    };
    return { entry };
  }
  return null;
}

function buildTeacherNa(project: Project): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const c of project.timeConstraints) {
    if (!c.active) continue;
    if (c.type === "TeacherNotAvailable" && c.teacherId) {
      const set = map.get(c.teacherId) ?? new Set<string>();
      for (const t of c.notAvailableTimes ?? []) set.add(`${t.day}|${t.hour}`);
      map.set(c.teacherId, set);
    }
  }
  return map;
}

function buildStudentNa(project: Project): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const c of project.timeConstraints) {
    if (!c.active) continue;
    if (c.type === "StudentsSetNotAvailable" && c.studentsSetId) {
      // expand to subgroups
      const sgIds = expandToSubgroups(project, c.studentsSetId);
      for (const t of c.notAvailableTimes ?? []) {
        for (const sgId of sgIds) {
          const set = map.get(sgId) ?? new Set<string>();
          set.add(`${t.day}|${t.hour}`);
          map.set(sgId, set);
        }
      }
    }
  }
  return map;
}

function buildRoomNa(project: Project): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const c of project.spaceConstraints) {
    if (!c.active) continue;
    if (c.type === "RoomNotAvailable" && c.roomId) {
      const set = map.get(c.roomId) ?? new Set<string>();
      for (const t of c.notAvailableTimes ?? []) set.add(`${t.day}|${t.hour}`);
      map.set(c.roomId, set);
    }
  }
  return map;
}

function expandToSubgroups(project: Project, id: string): string[] {
  for (const y of project.students) {
    if (y.id === id) {
      return y.groups.flatMap((g) => g.subgroups.map((s) => s.id));
    }
    for (const g of y.groups) {
      if (g.id === id) return g.subgroups.map((s) => s.id);
    }
  }
  return [id];
}
