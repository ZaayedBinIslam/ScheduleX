// Core data model for FET (Free Timetabling Software) projects.
// Mirrors the structure of a .fet file so it can be generated/parsed losslessly.

// ---------------------------------------------------------------------------
// Institution & schedule grid
// ---------------------------------------------------------------------------

export interface Institution {
  name: string;
  comments: string;
}

export interface DayConfig {
  name: string;
}

export interface HourConfig {
  name: string;
}

// ---------------------------------------------------------------------------
// Teachers / Subjects / Activity Tags
// ---------------------------------------------------------------------------

export interface Teacher {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface ActivityTag {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Students hierarchy: Year > Group > Subgroup
// ---------------------------------------------------------------------------

export interface Subgroup {
  id: string;
  name: string;
  numberOfStudents: number;
}

export interface StudentGroup {
  id: string;
  name: string;
  numberOfStudents: number;
  subgroups: Subgroup[];
}

export interface StudentYear {
  id: string;
  name: string;
  numberOfStudents: number;
  groups: StudentGroup[];
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  virtual: boolean;
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export interface Activity {
  id: number;
  teachers: string[]; // teacher ids
  subject: string; // subject id
  activityTags: string[]; // activity tag ids
  students: string[]; // subgroup ids
  duration: number;
  totalDuration: number;
  activityGroupId: number;
  isSplit: boolean;
  active: boolean;
  comments: string;
}

// ---------------------------------------------------------------------------
// Time constraints
// ---------------------------------------------------------------------------

export type TimeConstraintType =
  | "BasicCompulsory"
  | "TeacherNotAvailable"
  | "TeacherMaxDaysPerWeek"
  | "TeacherMaxHoursDaily"
  | "TeacherMaxGapsPerWeek"
  | "TeacherMinDaysPerWeek"
  | "TeacherMaxHoursContinuously"
  | "StudentsSetNotAvailable"
  | "StudentsSetMaxHoursDaily"
  | "StudentsSetMaxHoursContinuously"
  | "StudentsSetMinHoursDaily"
  | "ActivityPreferredStartingTime"
  | "ActivitiesSameStartingTime"
  | "ActivitiesNotOverlapping"
  | "MinNDaysBetweenActivities"
  | "MaxNDaysBetweenActivities"
  | "TwoActivitiesConsecutive"
  | "TwoActivitiesGrouped"
  | "ActivityEndsStudentsDay"
  // New Time Constraints
  | "BreakTimes"
  | "MinDaysBetweenActivities"
  | "ActivityPreferredTimeSlots"
  | "ActivitiesPreferredTimeSlots"
  | "ActivitiesSameStartingHour"
  | "MinGapsBetweenActivities";

export interface TimeConstraint {
  id: string;
  type: TimeConstraintType;
  weight: number;
  teacherId?: string;
  studentsSetId?: string;
  roomId?: string;
  subjectId?: string;
  activityTagId?: string;
  activityIds?: number[];
  firstActivityId?: number;
  secondActivityId?: number;
  maxDays?: number;
  maxHours?: number;
  maxGaps?: number;
  minDays?: number;
  minNDays?: number;
  maxNDays?: number;
  minHours?: number;
  minGapsBetweenActivities?: number;
  consecutiveIfSameDay?: boolean;
  notAvailableTimes?: TimeSlot[];
  preferredTimes?: TimeSlot[];
  preferredStartingTime?: TimeSlot;
  breakTimes?: TimeSlot[];
  active: boolean;
}

export interface TimeSlot {
  day: string;
  hour: string;
}

// ---------------------------------------------------------------------------
// Space constraints
// ---------------------------------------------------------------------------

export type SpaceConstraintType =
  | "BasicCompulsory"
  | "RoomNotAvailable"
  | "SubjectPreferredRoom"
  | "SubjectPreferredRooms"
  | "TeacherPreferredRoom"
  | "ActivityPreferredRoom"
  | "StudentsSetHomeRoom"
  // New Space Constraints
  | "ActivityPreferredRooms"
  | "SubjectActivityTagPreferredRoom"
  | "ActivitiesOccupyMaxDifferentRooms"
  | "ActivitiesSameRoomIfConsecutive";

export interface SpaceConstraint {
  id: string;
  type: SpaceConstraintType;
  weight: number;
  teacherId?: string;
  studentsSetId?: string;
  subjectId?: string;
  activityTagId?: string;
  roomId?: string;
  roomIds?: string[];
  activityId?: number;
  activityIds?: number[];
  capacity?: number;
  maxRooms?: number;
  notAvailableTimes?: TimeSlot[];
  active: boolean;
}

// ---------------------------------------------------------------------------
// Generated timetable
// ---------------------------------------------------------------------------

export interface TimetableEntry {
  activityId: number;
  teacherIds: string[];
  subjectId: string;
  activityTagIds: string[];
  studentIds: string[];
  duration: number;
  day: string;
  hour: string;
  room: string;
  teacherNames: string[];
  subjectName: string;
  activityTagNames: string[];
  studentNames: string[];
}

export interface Timetable {
  generatedAt: string;
  engine: "fet" | "fallback";
  fetVersion?: string;
  durationMs?: number;
  entries: TimetableEntry[];
  unassigned: Array<{ activityId: number; reason: string }>;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Project (aggregate root)
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  institution: Institution;
  days: DayConfig[];
  hours: HourConfig[];
  teachers: Teacher[];
  subjects: Subject[];
  activityTags: ActivityTag[];
  students: StudentYear[];
  activities: Activity[];
  rooms: Room[];
  timeConstraints: TimeConstraint[];
  spaceConstraints: SpaceConstraint[];
  timetable: Timetable | null;
  status: "draft" | "ready" | "generating" | "generated" | "error";
  createdAt: string;
  updatedAt: string;
}

/** Wizard step an issue belongs to, so the UI can link straight to the fix. */
export type ValidationStep =
  | "institution"
  | "grid"
  | "teachers"
  | "subjects"
  | "students"
  | "activities"
  | "rooms";

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
  step?: ValidationStep;
}

export function newProject(name = "Untitled Project"): Project {
  const now = new Date().toISOString();
  return {
    id: "",
    name,
    institution: { name: "", comments: "" },
    days: [],
    hours: [],
    teachers: [],
    subjects: [],
    activityTags: [],
    students: [],
    activities: [],
    rooms: [],
    timeConstraints: [],
    spaceConstraints: [],
    timetable: null,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}
