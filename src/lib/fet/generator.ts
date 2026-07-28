import type { Project, TimeConstraintType, TimeSlot } from "./types";
import { esc } from "./resolve";

// Generate a .fet file (XML) from a project.
// Format reference: https://lalescu.ro/liviu/fet/doc/en/instructions.html
// FET uses a custom XML-ish format (NOT proper XML namespaces) where each
// field is a tag. Whitespace/newlines inside the file are largely irrelevant
// to FET, but we keep it readable.

export function generateFetFile(project: Project): string {
  const p = project;
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<fet version="6.24.0">`);
  lines.push("");
  lines.push(`<Institution_Name>${esc(p.institution.name || p.name)}</Institution_Name>`);
  lines.push(`<Comments>${esc(p.institution.comments || "")}</Comments>`);
  lines.push("");

  // Days
  lines.push(`<Days_List>`);
  lines.push(`\t<Number_of_Days>${p.days.length}</Number_of_Days>`);
  for (const d of p.days) {
    lines.push(`\t<Day>`);
    lines.push(`\t\t<Name>${esc(d.name)}</Name>`);
    lines.push(`\t</Day>`);
  }
  lines.push(`</Days_List>`);
  lines.push("");

  // Hours
  lines.push(`<Hours_List>`);
  lines.push(`\t<Number_of_Hours>${p.hours.length}</Number_of_Hours>`);
  for (const h of p.hours) {
    lines.push(`\t<Hour>`);
    lines.push(`\t\t<Name>${esc(h.name)}</Name>`);
    lines.push(`\t</Hour>`);
  }
  lines.push(`</Hours_List>`);
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

  // Activity Tags
  lines.push(`<Activity_Tags_List>`);
  for (const t of p.activityTags) {
    lines.push(`\t<Activity_Tag>`);
    lines.push(`\t\t<Name>${esc(t.name)}</Name>`);
    lines.push(`\t</Activity_Tag>`);
  }
  lines.push(`</Activity_Tags_List>`);
  lines.push("");

  // Teachers
  lines.push(`<Teachers_List>`);
  for (const t of p.teachers) {
    lines.push(`\t<Teacher>`);
    lines.push(`\t\t<Name>${esc(t.name)}</Name>`);
    if (t.code) lines.push(`\t\t<Code>${esc(t.code)}</Code>`);
    if (t.longName) lines.push(`\t\t<Long_Name>${esc(t.longName)}</Long_Name>`);
    lines.push(
      `\t\t<Target_Number_of_Hours>${t.targetHours ?? 0}</Target_Number_of_Hours>`
    );
    if (t.subjects?.length) {
      lines.push(`\t\t<Qualified_Subjects>`);
      for (const sid of t.subjects) {
        const name = p.subjects.find((s) => s.id === sid)?.name;
        if (name) {
          lines.push(
            `\t\t\t<Qualified_Subject>${esc(name)}</Qualified_Subject>`
          );
        }
      }
      lines.push(`\t\t</Qualified_Subjects>`);
    }
    lines.push(`\t\t<Comments></Comments>`);
    lines.push(`\t</Teacher>`);
  }
  lines.push(`</Teachers_List>`);
  lines.push("");

  // Students (Years -> Groups -> Subgroups hierarchy)
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
    lines.push(`\t<Activity>`);
    for (const tId of a.teachers) {
      const t = p.teachers.find((t) => t.id === tId);
      if (t) lines.push(`\t\t<Teacher>${esc(t.name)}</Teacher>`);
    }
    const subj = p.subjects.find((s) => s.id === a.subject);
    if (subj) {
      lines.push(`\t\t<Subject>${esc(subj.name)}</Subject>`);
    }
    for (const atId of a.activityTags) {
      const at = p.activityTags.find((t) => t.id === atId);
      if (at) lines.push(`\t\t<Activity_Tag>${esc(at.name)}</Activity_Tag>`);
    }
    for (const sId of a.students) {
      const name = studentDisplayName(p, sId);
      if (name) {
        lines.push(`\t\t<Students>${esc(name)}</Students>`);
      }
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
  const buildings = new Set<string>();
  for (const r of realRooms) {
    if (r.building) buildings.add(r.building);
  }
  lines.push(`<Buildings_List>`);
  for (const b of buildings) {
    lines.push(`\t<Building>`);
    lines.push(`\t\t<Name>${esc(b)}</Name>`);
    lines.push(`\t</Building>`);
  }
  lines.push(`</Buildings_List>`);
  lines.push("");

  lines.push(`<Rooms_List>`);
  for (const r of realRooms) {
    lines.push(`\t<Room>`);
    lines.push(`\t\t<Name>${esc(r.name)}</Name>`);
    if (r.building) lines.push(`\t\t<Building>${esc(r.building)}</Building>`);
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

  // Constraints implied by a teacher's profile fields. An explicit constraint
  // of the same kind for the same teacher takes precedence, so editing the
  // Constraints step always overrides what the teacher card says.
  const hasExplicit = (type: TimeConstraintType, teacherId: string) =>
    p.timeConstraints.some(
      (c) => c.active && c.type === type && c.teacherId === teacherId
    );

  for (const t of p.teachers) {
    if (t.notAvailableTimes?.length && !hasExplicit("TeacherNotAvailable", t.id)) {
      lines.push(`\t<ConstraintTeacherNotAvailableTimes>`);
      lines.push(`\t\t<Weight_Percentage>100</Weight_Percentage>`);
      lines.push(`\t\t<Teacher>${esc(t.name)}</Teacher>`);
      lines.push(`\t\t<Number_of_Not_Available_Times>${t.notAvailableTimes.length}</Number_of_Not_Available_Times>`);
      for (const s of t.notAvailableTimes) {
        lines.push(`\t\t<Not_Available_Time>${naSlot(s)}</Not_Available_Time>`);
      }
      lines.push(`\t\t<Active>true</Active>`);
      lines.push(`\t\t<Comments></Comments>`);
      lines.push(`\t</ConstraintTeacherNotAvailableTimes>`);
    }
    if (t.maxHoursDaily && !hasExplicit("TeacherMaxHoursDaily", t.id)) {
      lines.push(`\t<ConstraintTeacherMaxHoursDaily>`);
      lines.push(`\t\t<Weight_Percentage>100</Weight_Percentage>`);
      lines.push(`\t\t<Teacher_Name>${esc(t.name)}</Teacher_Name>`);
      lines.push(`\t\t<Maximum_Hours_Daily>${t.maxHoursDaily}</Maximum_Hours_Daily>`);
      lines.push(`\t\t<Active>true</Active>`);
      lines.push(`\t\t<Comments></Comments>`);
      lines.push(`\t</ConstraintTeacherMaxHoursDaily>`);
    }
    if (t.maxDaysPerWeek && !hasExplicit("TeacherMaxDaysPerWeek", t.id)) {
      lines.push(`\t<ConstraintTeacherMaxDaysPerWeek>`);
      lines.push(`\t\t<Weight_Percentage>100</Weight_Percentage>`);
      lines.push(`\t\t<Teacher_Name>${esc(t.name)}</Teacher_Name>`);
      lines.push(`\t\t<Max_Days_Per_Week>${t.maxDaysPerWeek}</Max_Days_Per_Week>`);
      lines.push(`\t\t<Active>true</Active>`);
      lines.push(`\t\t<Comments></Comments>`);
      lines.push(`\t</ConstraintTeacherMaxDaysPerWeek>`);
    }
    if (
      t.maxGapsPerWeek !== undefined &&
      !hasExplicit("TeacherMaxGapsPerWeek", t.id)
    ) {
      lines.push(`\t<ConstraintTeacherMaxGapsPerWeek>`);
      lines.push(`\t\t<Weight_Percentage>100</Weight_Percentage>`);
      lines.push(`\t\t<Teacher_Name>${esc(t.name)}</Teacher_Name>`);
      lines.push(`\t\t<Max_Gaps>${t.maxGapsPerWeek}</Max_Gaps>`);
      lines.push(`\t\t<Active>true</Active>`);
      lines.push(`\t\t<Comments></Comments>`);
      lines.push(`\t</ConstraintTeacherMaxGapsPerWeek>`);
    }
  }

  // Locked activities from the current timetable are pinned to the slot the
  // user kept, at full weight, so a regeneration reshuffles everything else
  // around them instead of starting from a blank sheet.
  for (const e of p.timetable?.entries ?? []) {
    if (!e.locked) continue;
    if (!e.day || !e.hour) continue;
    lines.push(`\t<ConstraintActivityPreferredStartingTime>`);
    lines.push(`\t\t<Weight_Percentage>100</Weight_Percentage>`);
    lines.push(`\t\t<Activity_Id>${e.activityId}</Activity_Id>`);
    lines.push(`\t\t<Preferred_Day>${esc(e.day)}</Preferred_Day>`);
    lines.push(`\t\t<Preferred_Hour>${esc(e.hour)}</Preferred_Hour>`);
    lines.push(`\t\t<Active>true</Active>`);
    lines.push(`\t\t<Comments></Comments>`);
    lines.push(`\t</ConstraintActivityPreferredStartingTime>`);
  }

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
      case "StudentsSetMaxHoursContinuously": {
        lines.push(`\t<ConstraintStudentsSetMaxHoursContinuously>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Students>${esc(sName(c.studentsSetId))}</Students>`);
        lines.push(`\t\t<Maximum_Hours_Continuously>${c.maxHours ?? 4}</Maximum_Hours_Continuously>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintStudentsSetMaxHoursContinuously>`);
        break;
      }
      case "MaxNDaysBetweenActivities": {
        if (!c.activityIds?.length) break;
        // FET names this one without the N, unlike its Min counterpart.
        lines.push(`\t<ConstraintMaxDaysBetweenActivities>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Number_of_Activities>${c.activityIds.length}</Number_of_Activities>`);
        for (const id of c.activityIds) {
          lines.push(`\t\t<Activity_Id>${id}</Activity_Id>`);
        }
        lines.push(`\t\t<MaxDays>${c.maxNDays ?? 1}</MaxDays>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintMaxDaysBetweenActivities>`);
        break;
      }
      case "TwoActivitiesGrouped": {
        if (!c.firstActivityId || !c.secondActivityId) break;
        lines.push(`\t<ConstraintTwoActivitiesGrouped>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<First_Activity_Id>${c.firstActivityId}</First_Activity_Id>`);
        lines.push(`\t\t<Second_Activity_Id>${c.secondActivityId}</Second_Activity_Id>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintTwoActivitiesGrouped>`);
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
      case "BreakTimes": {
        lines.push(`\t<ConstraintBreakTimes>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Number_of_Break_Times>${c.breakTimes?.length ?? 0}</Number_of_Break_Times>`);
        for (const s of c.breakTimes ?? []) {
          lines.push(`\t\t<Break_Time><Day>${esc(s.day)}</Day><Hour>${esc(s.hour)}</Hour></Break_Time>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintBreakTimes>`);
        break;
      }
      case "MinDaysBetweenActivities": {
        if (!c.activityIds?.length) break;
        lines.push(`\t<ConstraintMinDaysBetweenActivities>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Consecutive_If_Same_Day>${c.consecutiveIfSameDay ? "true" : "false"}</Consecutive_If_Same_Day>`);
        lines.push(`\t\t<Number_of_Activities>${c.activityIds.length}</Number_of_Activities>`);
        for (const id of c.activityIds) {
          lines.push(`\t\t<Activity_Id>${id}</Activity_Id>`);
        }
        lines.push(`\t\t<MinDays>${c.minDays ?? 1}</MinDays>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintMinDaysBetweenActivities>`);
        break;
      }
      case "ActivityPreferredTimeSlots": {
        const aid = c.activityIds?.[0];
        if (!aid) break;
        lines.push(`\t<ConstraintActivityPreferredTimeSlots>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Activity_Id>${aid}</Activity_Id>`);
        lines.push(`\t\t<Number_of_Preferred_Time_Slots>${c.preferredTimes?.length ?? 0}</Number_of_Preferred_Time_Slots>`);
        for (const s of c.preferredTimes ?? []) {
          lines.push(`\t\t<Preferred_Time_Slot>`);
          lines.push(`\t\t\t<Preferred_Day>${esc(s.day)}</Preferred_Day>`);
          lines.push(`\t\t\t<Preferred_Hour>${esc(s.hour)}</Preferred_Hour>`);
          lines.push(`\t\t</Preferred_Time_Slot>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivityPreferredTimeSlots>`);
        break;
      }
      case "ActivitiesPreferredTimeSlots": {
        lines.push(`\t<ConstraintActivitiesPreferredTimeSlots>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Teacher_Name>${esc(tName(c.teacherId))}</Teacher_Name>`);
        lines.push(`\t\t<Students_Name>${esc(studentDisplayName(p, c.studentsSetId ?? ""))}</Students_Name>`);
        const subjName = p.subjects.find(s => s.id === c.subjectId)?.name ?? "";
        const tagName = p.activityTags.find(t => t.id === c.activityTagId)?.name ?? "";
        lines.push(`\t\t<Subject_Name>${esc(subjName)}</Subject_Name>`);
        lines.push(`\t\t<Activity_Tag_Name>${esc(tagName)}</Activity_Tag_Name>`);
        lines.push(`\t\t<Number_of_Preferred_Time_Slots>${c.preferredTimes?.length ?? 0}</Number_of_Preferred_Time_Slots>`);
        for (const s of c.preferredTimes ?? []) {
          lines.push(`\t\t<Preferred_Time_Slot>`);
          lines.push(`\t\t\t<Preferred_Day>${esc(s.day)}</Preferred_Day>`);
          lines.push(`\t\t\t<Preferred_Hour>${esc(s.hour)}</Preferred_Hour>`);
          lines.push(`\t\t</Preferred_Time_Slot>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivitiesPreferredTimeSlots>`);
        break;
      }
      case "ActivitiesSameStartingHour": {
        if (!c.activityIds?.length) break;
        lines.push(`\t<ConstraintActivitiesSameStartingHour>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Number_of_Activities>${c.activityIds.length}</Number_of_Activities>`);
        for (const id of c.activityIds) {
          lines.push(`\t\t<Activity_Id>${id}</Activity_Id>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivitiesSameStartingHour>`);
        break;
      }
      case "MinGapsBetweenActivities": {
        if (!c.activityIds?.length) break;
        lines.push(`\t<ConstraintMinGapsBetweenActivities>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Number_of_Activities>${c.activityIds.length}</Number_of_Activities>`);
        for (const id of c.activityIds) {
          lines.push(`\t\t<Activity_Id>${id}</Activity_Id>`);
        }
        lines.push(`\t\t<MinGaps>${c.minGapsBetweenActivities ?? 1}</MinGaps>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintMinGapsBetweenActivities>`);
        break;
      }
      case "ActivitiesNotOverlapping": {
        if (!c.activityIds?.length) break;
        lines.push(`\t<ConstraintActivitiesNotOverlapping>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Number_of_Activities>${c.activityIds.length}</Number_of_Activities>`);
        for (const id of c.activityIds) {
          lines.push(`\t\t<Activity_Id>${id}</Activity_Id>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivitiesNotOverlapping>`);
        break;
      }
      case "TwoActivitiesConsecutive": {
        if (!c.firstActivityId || !c.secondActivityId) break;
        lines.push(`\t<ConstraintTwoActivitiesConsecutive>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<First_Activity_Id>${c.firstActivityId}</First_Activity_Id>`);
        lines.push(`\t\t<Second_Activity_Id>${c.secondActivityId}</Second_Activity_Id>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintTwoActivitiesConsecutive>`);
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

  // Keep locked activities in the room they were locked in, too - pinning only
  // the time would let a regeneration move them to a different room.
  for (const e of p.timetable?.entries ?? []) {
    if (!e.locked || !e.room) continue;
    lines.push(`\t<ConstraintActivityPreferredRoom>`);
    lines.push(`\t\t<Weight_Percentage>100</Weight_Percentage>`);
    lines.push(`\t\t<Activity_Id>${e.activityId}</Activity_Id>`);
    lines.push(`\t\t<Room>${esc(e.room)}</Room>`);
    lines.push(`\t\t<Active>true</Active>`);
    lines.push(`\t\t<Comments></Comments>`);
    lines.push(`\t</ConstraintActivityPreferredRoom>`);
  }

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
      case "TeacherPreferredRoom": {
        // FET models "this teacher always teaches here" as a home room.
        lines.push(`\t<ConstraintTeacherHomeRoom>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Teacher>${esc(tName(c.teacherId))}</Teacher>`);
        lines.push(`\t\t<Room>${esc(rName(c.roomId))}</Room>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintTeacherHomeRoom>`);
        break;
      }
      case "ActivityPreferredRooms": {
        lines.push(`\t<ConstraintActivityPreferredRooms>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Activity_Id>${c.activityId}</Activity_Id>`);
        lines.push(`\t\t<Number_of_Preferred_Rooms>${c.roomIds?.length ?? 0}</Number_of_Preferred_Rooms>`);
        for (const rId of c.roomIds ?? []) {
          lines.push(`\t\t<Preferred_Room>${esc(rName(rId))}</Preferred_Room>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivityPreferredRooms>`);
        break;
      }
      case "SubjectPreferredRooms": {
        lines.push(`\t<ConstraintSubjectPreferredRooms>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Subject>${esc(sName(c.subjectId))}</Subject>`);
        lines.push(`\t\t<Number_of_Preferred_Rooms>${c.roomIds?.length ?? 0}</Number_of_Preferred_Rooms>`);
        for (const rId of c.roomIds ?? []) {
          lines.push(`\t\t<Preferred_Room>${esc(rName(rId))}</Preferred_Room>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintSubjectPreferredRooms>`);
        break;
      }
      case "SubjectActivityTagPreferredRoom": {
        lines.push(`\t<ConstraintSubjectActivityTagPreferredRoom>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Subject>${esc(sName(c.subjectId))}</Subject>`);
        const tagName = p.activityTags.find(t => t.id === c.activityTagId)?.name ?? "";
        lines.push(`\t\t<Activity_Tag>${esc(tagName)}</Activity_Tag>`);
        lines.push(`\t\t<Room>${esc(rName(c.roomId))}</Room>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintSubjectActivityTagPreferredRoom>`);
        break;
      }
      case "ActivitiesOccupyMaxDifferentRooms": {
        if (!c.activityIds?.length) break;
        lines.push(`\t<ConstraintActivitiesOccupyMaxDifferentRooms>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Number_of_Activities>${c.activityIds.length}</Number_of_Activities>`);
        for (const id of c.activityIds) {
          lines.push(`\t\t<Activity_Id>${id}</Activity_Id>`);
        }
        lines.push(`\t\t<Max_Number_of_Different_Rooms>${c.maxRooms ?? 1}</Max_Number_of_Different_Rooms>`);
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivitiesOccupyMaxDifferentRooms>`);
        break;
      }
      case "ActivitiesSameRoomIfConsecutive": {
        if (!c.activityIds?.length) break;
        lines.push(`\t<ConstraintActivitiesSameRoomIfConsecutive>`);
        lines.push(`\t\t<Weight_Percentage>${w}</Weight_Percentage>`);
        lines.push(`\t\t<Number_of_Activities>${c.activityIds.length}</Number_of_Activities>`);
        for (const id of c.activityIds) {
          lines.push(`\t\t<Activity_Id>${id}</Activity_Id>`);
        }
        lines.push(`\t\t<Active>true</Active>`);
        lines.push(`\t\t<Comments></Comments>`);
        lines.push(`\t</ConstraintActivitiesSameRoomIfConsecutive>`);
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
