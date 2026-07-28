// The catalogue of constraints the app can create and emit.
//
// This is the single source of truth for the "add constraint" pickers and the
// titles shown on constraint cards. Every type in TimeConstraintType /
// SpaceConstraintType must appear here (the Record types below make TypeScript
// enforce that), so a constraint can never be supported by the generator yet be
// unreachable from the UI.
//
// Only list a type here once generator.ts actually emits it — anything else
// would give the user a card that silently does nothing.

import type {
  SpaceConstraint,
  SpaceConstraintType,
  TimeConstraint,
  TimeConstraintType,
} from "./types";

export interface ConstraintDef<T extends string> {
  type: T;
  label: string;
  hint: string;
  /** Heading the entry is filed under in the picker. */
  category: string;
}

// "BasicCompulsory" is always emitted by the generator and is not user-addable,
// so it has a title but never appears in a picker.
export const TIME_CONSTRAINT_TITLES: Record<TimeConstraintType, string> = {
  BasicCompulsory: "Basic compulsory",
  TeacherNotAvailable: "Teacher not available",
  TeacherMaxDaysPerWeek: "Teacher max days/week",
  TeacherMinDaysPerWeek: "Teacher min days/week",
  TeacherMaxHoursDaily: "Teacher max hours/day",
  TeacherMaxHoursContinuously: "Teacher max hours in a row",
  TeacherMaxGapsPerWeek: "Teacher max gaps/week",
  StudentsSetNotAvailable: "Students not available",
  StudentsSetMaxHoursDaily: "Students max hours/day",
  StudentsSetMinHoursDaily: "Students min hours/day",
  StudentsSetMaxHoursContinuously: "Students max hours in a row",
  ActivityPreferredStartingTime: "Activity preferred start",
  ActivityPreferredTimeSlots: "Activity preferred slots",
  ActivitiesPreferredTimeSlots: "Activities preferred slots",
  ActivitiesSameStartingTime: "Activities same start",
  ActivitiesSameStartingHour: "Activities same starting hour",
  ActivitiesNotOverlapping: "Activities not overlapping",
  ActivityEndsStudentsDay: "Activity ends students' day",
  MinNDaysBetweenActivities: "Min days between (set)",
  MinDaysBetweenActivities: "Min days between (spread)",
  MaxNDaysBetweenActivities: "Max days between",
  MinGapsBetweenActivities: "Min gaps between",
  TwoActivitiesConsecutive: "Two activities consecutive",
  TwoActivitiesGrouped: "Two activities grouped",
  BreakTimes: "Break times",
};

export const SPACE_CONSTRAINT_TITLES: Record<SpaceConstraintType, string> = {
  BasicCompulsory: "Basic compulsory",
  RoomNotAvailable: "Room not available",
  SubjectPreferredRoom: "Subject preferred room",
  SubjectPreferredRooms: "Subject preferred rooms",
  SubjectActivityTagPreferredRoom: "Subject + tag preferred room",
  TeacherPreferredRoom: "Teacher home room",
  StudentsSetHomeRoom: "Students home room",
  ActivityPreferredRoom: "Activity preferred room",
  ActivityPreferredRooms: "Activity preferred rooms",
  ActivitiesOccupyMaxDifferentRooms: "Activities max different rooms",
  ActivitiesSameRoomIfConsecutive: "Activities same room if consecutive",
};

export const TIME_CONSTRAINTS: ConstraintDef<TimeConstraintType>[] = [
  // Teachers
  { type: "TeacherNotAvailable", category: "Teachers", label: "Not available at times", hint: "Block specific slots for a teacher" },
  { type: "TeacherMaxDaysPerWeek", category: "Teachers", label: "Max days per week", hint: "Limit how many days a teacher works" },
  { type: "TeacherMinDaysPerWeek", category: "Teachers", label: "Min days per week", hint: "Spread a teacher across at least N days" },
  { type: "TeacherMaxHoursDaily", category: "Teachers", label: "Max hours per day", hint: "Cap a teacher's daily teaching hours" },
  { type: "TeacherMaxHoursContinuously", category: "Teachers", label: "Max hours in a row", hint: "Force a break after N consecutive hours" },
  { type: "TeacherMaxGapsPerWeek", category: "Teachers", label: "Max gaps per week", hint: "Limit idle hours between a teacher's lessons" },

  // Students
  { type: "StudentsSetNotAvailable", category: "Students", label: "Not available at times", hint: "Block specific slots for a student set" },
  { type: "StudentsSetMaxHoursDaily", category: "Students", label: "Max hours per day", hint: "Cap a student set's daily hours" },
  { type: "StudentsSetMinHoursDaily", category: "Students", label: "Min hours per day", hint: "Avoid very short days for a student set" },
  { type: "StudentsSetMaxHoursContinuously", category: "Students", label: "Max hours in a row", hint: "Force a break after N consecutive hours" },

  // Activity placement
  { type: "ActivityPreferredStartingTime", category: "Activity placement", label: "Preferred starting time", hint: "Lock one activity to a specific day and hour" },
  { type: "ActivityPreferredTimeSlots", category: "Activity placement", label: "Preferred time slots", hint: "Restrict one activity to a set of slots" },
  { type: "ActivitiesPreferredTimeSlots", category: "Activity placement", label: "Preferred slots (filtered)", hint: "Restrict slots for every activity matching a teacher, subject or tag" },
  { type: "ActivityEndsStudentsDay", category: "Activity placement", label: "Ends the students' day", hint: "Schedule an activity as the last lesson of its day" },
  { type: "BreakTimes", category: "Activity placement", label: "Break times", hint: "Slots where nothing at all may be scheduled" },

  // Relations between activities
  { type: "ActivitiesSameStartingTime", category: "Between activities", label: "Same starting time", hint: "Activities must start on the same day and hour" },
  { type: "ActivitiesSameStartingHour", category: "Between activities", label: "Same starting hour", hint: "Activities start at the same hour, any day" },
  { type: "ActivitiesNotOverlapping", category: "Between activities", label: "Not overlapping", hint: "Activities must never share a time slot" },
  { type: "TwoActivitiesConsecutive", category: "Between activities", label: "Two consecutive", hint: "One activity runs immediately after another" },
  { type: "TwoActivitiesGrouped", category: "Between activities", label: "Two grouped", hint: "Two activities on the same day, back to back" },
  { type: "MinNDaysBetweenActivities", category: "Between activities", label: "Min days between (set)", hint: "Keep a chosen set of activities N days apart" },
  { type: "MinDaysBetweenActivities", category: "Between activities", label: "Min days between (spread)", hint: "Spread split lessons across the week" },
  { type: "MaxNDaysBetweenActivities", category: "Between activities", label: "Max days between", hint: "Keep activities within N days of each other" },
  { type: "MinGapsBetweenActivities", category: "Between activities", label: "Min gaps between", hint: "Require N free hours between activities" },
];

export const SPACE_CONSTRAINTS: ConstraintDef<SpaceConstraintType>[] = [
  // Rooms
  { type: "RoomNotAvailable", category: "Rooms", label: "Room not available", hint: "Block a room at specific slots" },

  // Who uses which room
  { type: "SubjectPreferredRoom", category: "Preferred rooms", label: "Subject → room", hint: "A subject should use one specific room" },
  { type: "SubjectPreferredRooms", category: "Preferred rooms", label: "Subject → rooms", hint: "A subject may use any of several rooms" },
  { type: "SubjectActivityTagPreferredRoom", category: "Preferred rooms", label: "Subject + tag → room", hint: "Narrow a subject to a room by activity tag" },
  { type: "TeacherPreferredRoom", category: "Preferred rooms", label: "Teacher home room", hint: "A teacher normally teaches in one room" },
  { type: "StudentsSetHomeRoom", category: "Preferred rooms", label: "Students home room", hint: "A student set always uses this room" },
  { type: "ActivityPreferredRoom", category: "Preferred rooms", label: "Activity → room", hint: "Lock one activity to a specific room" },
  { type: "ActivityPreferredRooms", category: "Preferred rooms", label: "Activity → rooms", hint: "Allow one activity in any of several rooms" },

  // Relations between activities
  { type: "ActivitiesOccupyMaxDifferentRooms", category: "Between activities", label: "Max different rooms", hint: "Limit how many rooms a set of activities spreads over" },
  { type: "ActivitiesSameRoomIfConsecutive", category: "Between activities", label: "Same room if consecutive", hint: "Back-to-back activities stay in one room" },
];

/**
 * Seed the type-specific fields of a newly added constraint so its editor opens
 * with usable values rather than blank inputs.
 */
export function newTimeConstraintDefaults(
  type: TimeConstraintType,
  firstDay: string,
  firstHour: string
): Partial<TimeConstraint> {
  switch (type) {
    case "TeacherNotAvailable":
    case "StudentsSetNotAvailable":
      return { notAvailableTimes: [] };
    case "BreakTimes":
      return { breakTimes: [] };
    case "ActivityPreferredTimeSlots":
    case "ActivitiesPreferredTimeSlots":
      return { preferredTimes: [], activityIds: [] };
    case "ActivityPreferredStartingTime":
      return {
        activityIds: [],
        preferredStartingTime: { day: firstDay, hour: firstHour },
      };
    case "TeacherMaxDaysPerWeek":
      return { maxDays: 5 };
    case "TeacherMinDaysPerWeek":
      return { minDays: 1 };
    case "TeacherMaxHoursDaily":
    case "StudentsSetMaxHoursDaily":
      return { maxHours: 6 };
    case "TeacherMaxHoursContinuously":
    case "StudentsSetMaxHoursContinuously":
      return { maxHours: 4 };
    case "StudentsSetMinHoursDaily":
      return { minHours: 1 };
    case "TeacherMaxGapsPerWeek":
      return { maxGaps: 0 };
    case "MinNDaysBetweenActivities":
      return { activityIds: [], minNDays: 1 };
    case "MinDaysBetweenActivities":
      return { activityIds: [], consecutiveIfSameDay: false };
    case "MaxNDaysBetweenActivities":
      return { activityIds: [], maxNDays: 1 };
    case "MinGapsBetweenActivities":
      return { activityIds: [], minGapsBetweenActivities: 1 };
    case "ActivitiesSameStartingTime":
    case "ActivitiesSameStartingHour":
    case "ActivitiesNotOverlapping":
      return { activityIds: [] };
    case "TwoActivitiesConsecutive":
    case "TwoActivitiesGrouped":
      return {};
    case "ActivityEndsStudentsDay":
      return { activityIds: [] };
    default:
      return {};
  }
}

export function newSpaceConstraintDefaults(
  type: SpaceConstraintType
): Partial<SpaceConstraint> {
  switch (type) {
    case "RoomNotAvailable":
      return { notAvailableTimes: [] };
    case "SubjectPreferredRooms":
    case "ActivityPreferredRooms":
      return { roomIds: [] };
    case "ActivitiesOccupyMaxDifferentRooms":
      return { activityIds: [], maxRooms: 1 };
    case "ActivitiesSameRoomIfConsecutive":
      return { activityIds: [] };
    default:
      return {};
  }
}
