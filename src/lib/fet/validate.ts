import type { Project, ValidationIssue } from "./types";
import { activityStudentCount, activitySubgroups } from "./resolve";

export function validateProject(p: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!p.institution.name.trim()) {
    issues.push({ level: "warning", message: "Institution name is empty." });
  }
  if (p.days.length === 0) {
    issues.push({ level: "error", message: "At least one day is required." });
  } else {
    const names = new Set<string>();
    for (const d of p.days) {
      if (!d.name.trim()) issues.push({ level: "error", message: "A day has an empty name." });
      if (names.has(d.name)) issues.push({ level: "error", message: `Duplicate day name: ${d.name}` });
      names.add(d.name);
    }
  }
  if (p.hours.length === 0) {
    issues.push({ level: "error", message: "At least one hour (period) is required." });
  } else {
    const names = new Set<string>();
    for (const h of p.hours) {
      if (!h.name.trim()) issues.push({ level: "error", message: "An hour has an empty name." });
      if (names.has(h.name)) issues.push({ level: "error", message: `Duplicate hour name: ${h.name}` });
      names.add(h.name);
    }
  }

  // Teachers
  const teacherNames = new Set<string>();
  for (const t of p.teachers) {
    if (!t.name.trim()) issues.push({ level: "error", message: "A teacher has an empty name." });
    if (teacherNames.has(t.name)) issues.push({ level: "error", message: `Duplicate teacher name: ${t.name}` });
    teacherNames.add(t.name);
  }

  // Subjects
  const subjectNames = new Set<string>();
  for (const s of p.subjects) {
    if (!s.name.trim()) issues.push({ level: "error", message: "A subject has an empty name." });
    if (subjectNames.has(s.name)) issues.push({ level: "error", message: `Duplicate subject name: ${s.name}` });
    subjectNames.add(s.name);
  }

  // Students
  const sgNames = new Set<string>();
  const validStudentIds = new Set<string>();
  for (const y of p.students) {
    validStudentIds.add(y.id);
    if (!y.name.trim()) issues.push({ level: "error", message: "A student year has an empty name." });
    for (const g of y.groups) {
      validStudentIds.add(g.id);
      if (!g.name.trim()) issues.push({ level: "error", message: `Group under ${y.name} has an empty name.` });
      for (const s of g.subgroups) {
        validStudentIds.add(s.id);
        if (!s.name.trim()) issues.push({ level: "error", message: `A subgroup under ${y.name}/${g.name} has an empty name.` });
        if (sgNames.has(s.name)) issues.push({ level: "error", message: `Duplicate subgroup name: ${s.name}` });
        sgNames.add(s.name);
      }
    }
  }

  // Rooms
  const roomNames = new Set<string>();
  for (const r of p.rooms) {
    if (!r.virtual) {
      if (!r.name.trim()) issues.push({ level: "error", message: "A room has an empty name." });
      if (roomNames.has(r.name)) issues.push({ level: "error", message: `Duplicate room name: ${r.name}` });
      roomNames.add(r.name);
    }
  }

  // Activities
  if (p.activities.length === 0) {
    issues.push({ level: "error", message: "At least one activity is required." });
  }
  const actIds = new Set<number>();
  for (const a of p.activities) {
    if (actIds.has(a.id)) issues.push({ level: "error", message: `Duplicate activity id: ${a.id}` });
    actIds.add(a.id);
    if (a.teachers.length === 0) issues.push({ level: "warning", message: `Activity #${a.id} has no teacher.` });
    if (!a.subject) issues.push({ level: "error", message: `Activity #${a.id} has no subject.` });
    if (a.students.length === 0) issues.push({ level: "warning", message: `Activity #${a.id} has no students.` });
    if (a.duration < 1) issues.push({ level: "error", message: `Activity #${a.id} has invalid duration.` });
    if (a.duration > p.hours.length)
      issues.push({ level: "error", message: `Activity #${a.id} duration exceeds hours per day (${p.hours.length}).` });
    // teacher existence
    for (const tid of a.teachers) {
      if (!p.teachers.find((t) => t.id === tid))
        issues.push({ level: "error", message: `Activity #${a.id} references an unknown teacher.` });
    }
    if (a.subject && !p.subjects.find((s) => s.id === a.subject))
      issues.push({ level: "error", message: `Activity #${a.id} references an unknown subject.` });
    for (const sid of a.students) {
      if (!validStudentIds.has(sid)) {
        issues.push({
          level: "error",
          message: `Activity #${a.id} references unknown student ID "${sid}".`,
        });
      }
    }
    // room capacity sanity
    const count = activityStudentCount(p, a);
    const rooms = p.rooms.filter((r) => !r.virtual);
    if (rooms.length > 0 && count > 0) {
      const maxCap = Math.max(...rooms.map((r) => r.capacity));
      if (count > maxCap)
        issues.push({ level: "warning", message: `Activity #${a.id} has ${count} students but the largest room holds ${maxCap}.` });
    }
  }

  return issues;
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}

// Quick stats for a project (used in UI summaries).
export function projectStats(p: Project) {
  const subgroupCount = p.students.reduce(
    (acc, y) => acc + y.groups.reduce((a, g) => a + g.subgroups.length, 0),
    0
  );
  return {
    days: p.days.length,
    hours: p.hours.length,
    teachers: p.teachers.length,
    subjects: p.subjects.length,
    activityTags: p.activityTags.length,
    students: p.students.length,
    subgroups: subgroupCount,
    activities: p.activities.filter((a) => a.active).length,
    rooms: p.rooms.filter((r) => !r.virtual).length,
    timeConstraints: p.timeConstraints.filter((c) => c.active).length,
    spaceConstraints: p.spaceConstraints.filter((c) => c.active).length,
  };
}
