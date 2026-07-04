import type {
  Activity,
  ActivityTag,
  Project,
  Room,
  StudentYear,
  Subject,
  Teacher,
} from "./types";

// Resolve a teacher id to its name.
export function teacherName(p: Project, id: string): string {
  return p.teachers.find((t) => t.id === id)?.name ?? id;
}

export function subjectName(p: Project, id: string): string {
  return p.subjects.find((s) => s.id === id)?.name ?? id;
}

export function activityTagName(p: Project, id: string): string {
  return p.activityTags.find((t) => t.id === id)?.name ?? id;
}

// Resolve a student-set id (year / group / subgroup) to a display name.
export function studentSetName(p: Project, id: string): string {
  for (const y of p.students) {
    if (y.id === id) return y.name;
    for (const g of y.groups) {
      if (g.id === id) return g.name;
      for (const s of g.subgroups) {
        if (s.id === id) return s.name;
      }
    }
  }
  return id;
}

export function roomName(p: Project, id: string): string {
  return p.rooms.find((r) => r.id === id)?.name ?? id;
}

// Expand a student-set id into the list of leaf subgroup ids it contains.
// FET treats "students" as subgroup-level sets, so years/groups are expanded.
export function expandStudentSet(p: Project, id: string): string[] {
  for (const y of p.students) {
    if (y.id === id) {
      return y.groups.flatMap((g) => g.subgroups.map((s) => s.id));
    }
    for (const g of y.groups) {
      if (g.id === id) {
        return g.subgroups.map((s) => s.id);
      }
    }
  }
  // already a subgroup (or unknown)
  return [id];
}

// Expand an activity's student sets into leaf subgroup ids.
export function activitySubgroups(p: Project, a: Activity): string[] {
  return Array.from(new Set(a.students.flatMap((s) => expandStudentSet(p, s))));
}

// Aggregate count of students involved in an activity.
export function activityStudentCount(p: Project, a: Activity): number {
  const ids = new Set(activitySubgroups(p, a));
  let count = 0;
  for (const y of p.students) {
    for (const g of y.groups) {
      for (const s of g.subgroups) {
        if (ids.has(s.id)) count += s.numberOfStudents;
      }
    }
  }
  return count;
}

export function teacherById(p: Project, id: string): Teacher | undefined {
  return p.teachers.find((t) => t.id === id);
}
export function subjectById(p: Project, id: string): Subject | undefined {
  return p.subjects.find((s) => s.id === id);
}
export function activityTagById(p: Project, id: string): ActivityTag | undefined {
  return p.activityTags.find((t) => t.id === id);
}
export function roomById(p: Project, id: string): Room | undefined {
  return p.rooms.find((r) => r.id === id);
}

// Flatten students into a list of [year, group, subgroup] tuples.
export function flattenStudents(p: Project) {
  const out: Array<{
    year: StudentYear;
    group?: { year: StudentYear; group: typeof p.students[number]["groups"][number] };
    subgroup?: { year: StudentYear; group: typeof p.students[number]["groups"][number]; subgroup: typeof p.students[number]["groups"][number]["subgroups"][number] };
    level: "year" | "group" | "subgroup";
    id: string;
    name: string;
    count: number;
  }> = [];
  for (const y of p.students) {
    out.push({ year: y, level: "year", id: y.id, name: y.name, count: y.numberOfStudents });
    for (const g of y.groups) {
      out.push({
        year: y,
        group: { year: y, group: g },
        level: "group",
        id: g.id,
        name: g.name,
        count: g.numberOfStudents,
      });
      for (const s of g.subgroups) {
        out.push({
          year: y,
          group: { year: y, group: g },
          subgroup: { year: y, group: g, subgroup: s },
          level: "subgroup",
          id: s.id,
          name: s.name,
          count: s.numberOfStudents,
        });
      }
    }
  }
  return out;
}

export function uid(prefix = ""): string {
  return (
    prefix +
    Math.random().toString(36).slice(2, 8) +
    Date.now().toString(36).slice(-4)
  );
}

// XML escape
export function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
