import type { Project, TimeSlot } from "./types";
import { activitySubgroups, esc } from "./resolve";

// Generate a .fet file (XML) from a project.
// Format reference: https://lalescu.ro/liviu/fet/doc/en/instructions.html
// FET uses a custom XML-ish format (NOT proper XML namespaces) where each
// field is a tag. Whitespace/newlines inside the file are largely irrelevant
// to FET, but we keep it readable.

export function generateFetFile(project: Project): string {
  const p = project;
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<fet name="${esc(p.institution.name || p.name)}">`);
  lines.push("");
  lines.push(`<Institution_Name>${esc(p.institution.name || p.name)}</Institution_Name>`);
  lines.push(`<Comments>${esc(p.institution.comments || "")}</Comments>`);
  lines.push("");

  // Days
  lines.push(`<Days_List>`);
  lines.push(`\t<Number>${p.days.length}</Number>`);
  for (const d of p.days) {
    lines.push(`\t<Name>${esc(d.name)}</Name>`);
  }
  lines.push(`</Days_List>`);
  lines.push("");

  // Hours
  lines.push(`<Hours_List>`);
  lines.push(`\t<Number>${p.hours.length}</Number>`);
  for (const h of p.hours) {
    lines.push(`\t<Name>${esc(h.name)}</Name>`);
  }
  lines.push(`</Hours_List>`);
  lines.push("");

  // Teachers
  lines.push(`<Teachers_List>`);
  for (const t of p.teachers) {
    lines.push(`\t<Teacher>`);
    lines.push(`\t\t<Name>${esc(t.name)}</Name>`);
    lines.push(`\t</Teacher>`);
  }
  lines.push(`</Teachers_List>`);
  lines.push("");

  // Subjects
  lines.push(`<Subjects_List>`);
  for (const s of p.subjects) {
    lines.push(`\t<Subject>`);
    lines.push(`\t\t<Name>${esc(s.name)}</Name>`);
    lines.push(`\t</Subject>`);
  }
  lines.push(`</Subjects_List>`);
  lines.push("");

  // Activity tags
  lines.push(`<Activity_Tags_List>`);
  for (const at of p.activityTags) {
    lines.push(`\t<Activity_Tag>`);
    lines.push(`\t\t<Name>${esc(at.name)}</Name>`);
    lines.push(`\t</Activity_Tag>`);
  }
  lines.push(`</Activity_Tags_List>`);
  lines.push("");

  // Students (Year > Group > Subgroup)
  lines.push(`<Students_List>`);
  for (const y of p.students) {
    lines.push(`\t<Year>`);
    lines.push(`\t\t<Name>${esc(y.name)}</Name>`);
    lines.push(`\t\t<Number_of_Students>${y.numberOfStudents}</Number_of_Students>`);
    for (const g of y.groups) {
      lines.push(`\t\t<Group>`);
      lines.push(`\t\t\t<Name>${esc(g.name)}</Name>`);
      lines.push(`\t\t\t<Number_of_Students>${g.numberOfStudents}</Number_of_Students>`);
      for (const s of g.subgroups) {
        lines.push(`\t\t\t<Subgroup>`);
        lines.push(`\t\t\t\t<Name>${esc(s.name)}</Name>`);
        lines.push(`\t\t\t\t<Number_of_Students>${s.numberOfStudents}</Number_of_Students>`);
        lines.push(`\t\t\t</Subgroup>`);
      }
      lines.push(`\t\t</Group>`);
    }
    lines.push(`\t</Year>`);
  }
  lines.push(`</Students_List>`);
  lines.push("");

  // Activities
  lines.push(`<Activities_List>`);
  for (const a of p.activities) {
    if (!a.active) continue;
    const sgIds = activitySubgroups(p, a);
    lines.push(`\t<Activity>`);
    lines.push(`\t\t<Teacher>${esc(p.teachers.find((t) => t.id === a.teachers[0])?.name ?? "")}</Teacher>`);
    for (let i = 1; i < a.teachers.length; i++) {
      lines.push(`\t\t<Teacher>${esc(p.teachers.find((t) => t.id === a.teachers[i])?.name ?? "")}</Teacher>`);
    }
    lines.push(`\t\t<Subject>${esc(p.subjects.find((s) => s.id === a.subject)?.name ?? "")}</Subject>`);
    for (const atId of a.activityTags) {
      lines.push(`\t\t<Activity_Tag>${esc(p.activityTags.find((t) => t.id === atId)?.name ?? "")}</Activity_Tag>`);
    }
    for (const sgId of sgIds) {
      const sg = findSubgroupName(p, sgId);
      lines.push(`\t\t<Students>${esc(sg)}</Students>`);
    }
    lines.push(`\t\t<Duration>${a.duration}</Duration>`);
    lines.push(`\t\t<Total_Duration>${a.totalDuration || a.duration}</Total_Duration>`);
    lines.push(`\t\t<Id>${a.id}</Id>`);
    lines.push(`\t\t<Activity_Group_Id>${a.activityGroupId || 0}</Activity_Group_Id>`);
    lines.push(`\t\t<Active>${a.active ? "true" : "false"}</Active>`);
    lines.push(`\t\t<Comments>${esc(a.comments || "")}</Comments>`);
    lines.push(`\t</Activity>`);
  }
  lines.push(`</Activities_List>`);
  lines.push("");

  // Rooms
  const realRooms = p.rooms.filter((r) => !r.virtual);
  lines.push(`<Rooms_List>`);
  for (const r of realRooms) {
    lines.push(`\t<Room>`);
    lines.push(`\t\t<Name>${esc(r.name)}</Name>`);
    lines.push(`\t\t<Building>${esc(r.building || "")}</Building>`);
    lines.push(`\t\t<Capacity>${r.capacity}</Capacity>`);
    lines.push(`\t</Room>`);
  }
  lines.push(`</Rooms_List>`);
  lines.push("");

  // Time constraints
  // FET's not-available-time format uses <Day>/<Hour> subtags inside
  // <Not_Available_Time> (verified against FET source rules.cpp).
  const naSlot = (s: TimeSlot) => `<Day>${esc(s.day)}</Day><Hour>${esc(s.hour)}</Hour>`;
  lines.push(`<Time_Constraints_List>`);
  // Always include basic compulsory
  lines.push(`\t<ConstraintBasicCompulsoryTime>`);
  lines.push(`\t\t<Weight_Percentage>100</Weight_Percentage>`);
  lines.push(`\t\t<Active>true</Active>`);
  lines.push(`\t\t<Comments></Comments>`);
  lines.push(`\t</ConstraintBasicCompulsoryTime>`);

  for (const c of p.timeConstraints) {
    if (!c.active) continue;
    const w = c.weight;
    const tName = (id?: string) =>
      p.teachers.find((t) => t.id === id)?.name ?? "";
    const sName = (id?: string) => studentDisplayName(p, id ?? "");

    switch (c.type) {
      case "TeacherNotAvailable": {
        lines.push(`\t<ConstraintTeacherNotAvailableTimes>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Teacher>${esc(tName(c.teacherId))}</Teacher>`);
        lines.push(`\t\t<Number_of_Not_Available_Times>${c.notAvailableTimes?.length ?? 0}</Number_of_Not_Available_Times>`);
        for (const s of c.notAvailableTimes ?? []) {
          lines.push(`\t\t<Not_Available_Time>${naSlot(s)}</Not_Available_Time>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintTeacherNotAvailableTimes>`);
        break;
      }
      case "TeacherMaxDaysPerWeek": {
        lines.push(`\t<ConstraintTeacherMaxDaysPerWeek>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Teacher_Name>${esc(tName(c.teacherId))}</Teacher_Name>`);
        lines.push(`\t\t<Max_Days_Per_Week>${c.maxDays ?? 5}</Max_Days_Per_Week>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintTeacherMaxDaysPerWeek>`);
        break;
      }
      case "TeacherMaxHoursDaily": {
        lines.push(`\t<ConstraintTeacherMaxHoursDaily>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Teacher_Name>${esc(tName(c.teacherId))}</Teacher_Name>`);
        lines.push(`\t\t<Maximum_Hours_Daily>${c.maxHours ?? 8}</Maximum_Hours_Daily>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintTeacherMaxHoursDaily>`);
        break;
      }
      case "TeacherMaxGapsPerWeek": {
        lines.push(`\t<ConstraintTeacherMaxGapsPerWeek>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Teacher_Name>${esc(tName(c.teacherId))}</Teacher_Name>`);
        lines.push(`\t\t<Max_Gaps>${c.maxGaps ?? 0}</Max_Gaps>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintTeacherMaxGapsPerWeek>`);
        break;
      }
      case "TeacherMinDaysPerWeek": {
        lines.push(`\t<ConstraintTeacherMinDaysPerWeek>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Teacher_Name>${esc(tName(c.teacherId))}</Teacher_Name>`);
        lines.push(`\t\t<Minimum_Days_Per_Week>${c.minDays ?? 1}</Minimum_Days_Per_Week>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintTeacherMinDaysPerWeek>`);
        break;
      }
      case "TeacherMaxHoursContinuously": {
        lines.push(`\t<ConstraintTeacherMaxHoursContinuously>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Teacher_Name>${esc(tName(c.teacherId))}</Teacher_Name>`);
        lines.push(`\t\t<Maximum_Hours_Continuously>${c.maxHours ?? 4}</Maximum_Hours_Continuously>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintTeacherMaxHoursContinuously>`);
        break;
      }
      case "StudentsSetNotAvailable": {
        lines.push(`\t<ConstraintStudentsSetNotAvailableTimes>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Students>${esc(sName(c.studentsSetId))}</Students>`);
        lines.push(`\t\t<Number_of_Not_Available_Times>${c.notAvailableTimes?.length ?? 0}</Number_of_Not_Available_Times>`);
        for (const s of c.notAvailableTimes ?? []) {
          lines.push(`\t\t<Not_Available_Time>${naSlot(s)}</Not_Available_Time>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintStudentsSetNotAvailableTimes>`);
        break;
      }
      case "StudentsSetMaxHoursDaily": {
        lines.push(`\t<ConstraintStudentsSetMaxHoursDaily>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Students>${esc(sName(c.studentsSetId))}</Students>`);
        lines.push(`\t\t<Maximum_Hours_Daily>${c.maxHours ?? 8}</Maximum_Hours_Daily>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintStudentsSetMaxHoursDaily>`);
        break;
      }
      case "StudentsSetMinHoursDaily": {
        lines.push(`\t<ConstraintStudentsSetMinHoursDaily>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Students>${esc(sName(c.studentsSetId))}</Students>`);
        lines.push(`\t\t<Minimum_Hours_Daily>${c.minHours ?? 1}</Minimum_Hours_Daily>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintStudentsSetMinHoursDaily>`);
        break;
      }
      case "ActivityPreferredStartingTime": {
        if (!c.preferredStartingTime) break;
        const aid = c.activityIds?.[0];
        lines.push(`\t<ConstraintActivityPreferredStartingTime>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Activity_Id>${aid}</Activity_Id>`);
        lines.push(`\t\t<Preferred_Day>${esc(c.preferredStartingTime.day)}</Preferred_Day>`);
        lines.push(`\t\t<Preferred_Hour>${esc(c.preferredStartingTime.hour)}</Preferred_Hour>`);
        lines.push(`\t\t<Permanently_Locked>true</Permanently_Locked>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivityPreferredStartingTime>`);
        break;
      }
      case "ActivitiesSameStartingTime": {
        if (!c.activityIds?.length) break;
        lines.push(`\t<ConstraintActivitiesSameStartingTime>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Number_of_Activities>${c.activityIds.length}</Number_of_Activities>`);
        for (const id of c.activityIds) {
          lines.push(`\t\t<Activity_Id>${id}</Activity_Id>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivitiesSameStartingTime>`);
        break;
      }
      case "MinNDaysBetweenActivities": {
        if (!c.activityIds?.length) break;
        lines.push(`\t<ConstraintMinNDaysBetweenActivities>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Number_of_Activities>${c.activityIds.length}</Number_of_Activities>`);
        for (const id of c.activityIds) {
          lines.push(`\t\t<Activity_Id>${id}</Activity_Id>`);
        }
        lines.push(`\t\t<MinDays>${c.minNDays ?? 1}</MinDays>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintMinNDaysBetweenActivities>`);
        break;
      }
      case "ActivityEndsStudentsDay": {
        const aid = c.activityIds?.[0];
        if (!aid) break;
        lines.push(`\t<ConstraintActivityEndsStudentsDay>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Activity_Id>${aid}</Activity_Id>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivityEndsStudentsDay>`);
        break;
      }
      default:
        // unsupported constraint types are silently skipped to keep file valid
        break;
    }
  }
  lines.push(`</Time_Constraints_List>`);
  lines.push("");

  // Space constraints
  lines.push(`<Space_Constraints_List>`);
  lines.push(`\t<ConstraintBasicCompulsorySpace>`);
  lines.push(`\t\t<Weight_Percentage>100</Weight_Percentage>`);
  lines.push(`\t\t<Active>true</Active>`);
  lines.push(`\t\t<Comments></Comments>`);
  lines.push(`\t</ConstraintBasicCompulsorySpace>`);

  for (const c of p.spaceConstraints) {
    if (!c.active) continue;
    const w = c.weight;
    const tName = (id?: string) =>
      p.teachers.find((t) => t.id === id)?.name ?? "";
    const sName = (id?: string) => p.subjects.find((s) => s.id === id)?.name ?? "";
    const rName = (id?: string) => p.rooms.find((r) => r.id === id)?.name ?? "";
    const ssName = (id?: string) => studentDisplayName(p, id ?? "");

    switch (c.type) {
      case "RoomNotAvailable": {
        lines.push(`\t<ConstraintRoomNotAvailableTimes>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Room>${esc(rName(c.roomId))}</Room>`);
        lines.push(`\t\t<Number_of_Not_Available_Times>${c.notAvailableTimes?.length ?? 0}</Number_of_Not_Available_Times>`);
        for (const s of c.notAvailableTimes ?? []) {
          lines.push(`\t\t<Not_Available_Time>${naSlot(s)}</Not_Available_Time>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintRoomNotAvailableTimes>`);
        break;
      }
      case "SubjectPreferredRoom": {
        lines.push(`\t<ConstraintSubjectPreferredRoom>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Subject>${esc(sName(c.subjectId))}</Subject>`);
        lines.push(`\t\t<Room>${esc(rName(c.roomId))}</Room>`);
        lines.push(`\t\t<Permanently_Locked>false</Permanently_Locked>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintSubjectPreferredRoom>`);
        break;
      }
      case "ActivityPreferredRoom": {
        lines.push(`\t<ConstraintActivityPreferredRoom>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Activity_Id>${c.activityId}</Activity_Id>`);
        lines.push(`\t\t<Room>${esc(rName(c.roomId))}</Room>`);
        lines.push(`\t\t<Permanently_Locked>false</Permanently_Locked>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivityPreferredRoom>`);
        break;
      }
      case "StudentsSetHomeRoom": {
        lines.push(`\t<ConstraintStudentsSetHomeRoom>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Students>${esc(ssName(c.studentsSetId))}</Students>`);
        lines.push(`\t\t<Room>${esc(rName(c.roomId))}</Room>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintStudentsSetHomeRoom>`);
        break;
      }
      case "RoomMaxCapacity": {
        lines.push(`\t<ConstraintRoomMaxCapacity>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Room>${esc(rName(c.roomId))}</Room>`);
        lines.push(`\t\t<Capacity>${c.capacity}</Capacity>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintRoomMaxCapacity>`);
        break;
      }
      default:
        break;
    }
  }
  lines.push(`</Space_Constraints_List>`);
  lines.push("");
  lines.push(`</fet>`);

  return lines.join("\n");
}

// Find the FET display name for a subgroup id.
function findSubgroupName(p: Project, sgId: string): string {
  for (const y of p.students) {
    for (const g of y.groups) {
      for (const s of g.subgroups) {
        if (s.id === sgId) return s.name;
      }
    }
  }
  return sgId;
}

// Display name for a year/group/subgroup id.
function studentDisplayName(p: Project, id: string): string {
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
