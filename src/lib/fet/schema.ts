import { z } from "zod";
import type { Project, TimeConstraintType, SpaceConstraintType } from "./types";

export const InstitutionSchema = z.object({
  name: z.string(),
  comments: z.string().optional().default(""),
});

export const DayConfigSchema = z.object({
  name: z.string(),
});

export const HourConfigSchema = z.object({
  name: z.string(),
});

export const TeacherSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const SubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ActivityTagSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const SubgroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  numberOfStudents: z.number(),
});

export const StudentGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  numberOfStudents: z.number(),
  subgroups: z.array(SubgroupSchema),
});

export const StudentYearSchema = z.object({
  id: z.string(),
  name: z.string(),
  numberOfStudents: z.number(),
  groups: z.array(StudentGroupSchema),
});

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  building: z.string().optional().default(""),
  capacity: z.number(),
  virtual: z.boolean().optional().default(false),
});

export const ActivitySchema = z.object({
  id: z.number(),
  teachers: z.array(z.string()),
  subject: z.string(),
  activityTags: z.array(z.string()),
  students: z.array(z.string()),
  duration: z.number(),
  totalDuration: z.number(),
  activityGroupId: z.number(),
  isSplit: z.boolean(),
  active: z.boolean(),
  comments: z.string().optional().default(""),
});

export const TimeSlotSchema = z.object({
  day: z.string(),
  hour: z.string(),
});

export const TimeConstraintSchema = z.object({
  id: z.string(),
  type: z.string() as z.ZodType<TimeConstraintType>,
  weight: z.number(),
  teacherId: z.string().optional(),
  studentsSetId: z.string().optional(),
  roomId: z.string().optional(),
  subjectId: z.string().optional(),
  activityTagId: z.string().optional(),
  activityIds: z.array(z.number()).optional(),
  firstActivityId: z.number().optional(),
  secondActivityId: z.number().optional(),
  maxDays: z.number().optional(),
  maxHours: z.number().optional(),
  maxGaps: z.number().optional(),
  minDays: z.number().optional(),
  minNDays: z.number().optional(),
  maxNDays: z.number().optional(),
  minHours: z.number().optional(),
  minGapsBetweenActivities: z.number().optional(),
  consecutiveIfSameDay: z.boolean().optional(),
  notAvailableTimes: z.array(TimeSlotSchema).optional(),
  preferredTimes: z.array(TimeSlotSchema).optional(),
  preferredStartingTime: TimeSlotSchema.optional(),
  breakTimes: z.array(TimeSlotSchema).optional(),
  active: z.boolean(),
});

export const SpaceConstraintSchema = z.object({
  id: z.string(),
  type: z.string() as z.ZodType<SpaceConstraintType>,
  weight: z.number(),
  teacherId: z.string().optional(),
  studentsSetId: z.string().optional(),
  subjectId: z.string().optional(),
  activityTagId: z.string().optional(),
  roomId: z.string().optional(),
  roomIds: z.array(z.string()).optional(),
  activityId: z.number().optional(),
  activityIds: z.array(z.number()).optional(),
  capacity: z.number().optional(),
  maxRooms: z.number().optional(),
  notAvailableTimes: z.array(TimeSlotSchema).optional(),
  active: z.boolean(),
});

export const TimetableEntrySchema = z.object({
  activityId: z.number(),
  teacherIds: z.array(z.string()),
  subjectId: z.string(),
  activityTagIds: z.array(z.string()),
  studentIds: z.array(z.string()),
  duration: z.number(),
  day: z.string(),
  hour: z.string(),
  room: z.string(),
  teacherNames: z.array(z.string()),
  subjectName: z.string(),
  activityTagNames: z.array(z.string()),
  studentNames: z.array(z.string()),
});

export const TimetableSchema = z.object({
  generatedAt: z.string(),
  engine: z.enum(["fet", "fallback"]),
  fetVersion: z.string().optional(),
  entries: z.array(TimetableEntrySchema),
  unassigned: z.array(
    z.object({
      activityId: z.number(),
      reason: z.string(),
    })
  ),
  warnings: z.array(z.string()),
});

export const ProjectSchema: z.ZodType<Project> = z.object({
  id: z.string(),
  name: z.string(),
  institution: InstitutionSchema,
  days: z.array(DayConfigSchema),
  hours: z.array(HourConfigSchema),
  teachers: z.array(TeacherSchema),
  subjects: z.array(SubjectSchema),
  activityTags: z.array(ActivityTagSchema),
  students: z.array(StudentYearSchema),
  activities: z.array(ActivitySchema),
  rooms: z.array(RoomSchema),
  timeConstraints: z.array(TimeConstraintSchema),
  spaceConstraints: z.array(SpaceConstraintSchema),
  timetable: TimetableSchema.nullable(),
  status: z.enum(["draft", "ready", "generating", "generated", "error"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
