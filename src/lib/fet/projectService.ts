import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Project, Timetable } from "./types";

// Prisma throws P2025 when an update/delete targets a row that doesn't exist.
// Anything else — a dropped connection, an unreachable cluster — must not be
// reported to the caller as "not found", so we only swallow P2025 and rethrow
// the rest. This matters more on MongoDB than it did on a local SQLite file.
function isRecordNotFound(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";
}

// Serialize/deserialize a Project to/from DB rows.
type ProjectRow = {
  id: string;
  name: string;
  data: string;
  timetable: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function rowToProject(row: ProjectRow): Project {
  const data = JSON.parse(row.data) as Partial<Project>;
  const tt = row.timetable ? (JSON.parse(row.timetable) as Timetable) : null;
  return {
    id: row.id,
    name: row.name,
    institution: data.institution ?? { name: "", comments: "" },
    days: data.days ?? [],
    hours: data.hours ?? [],
    teachers: data.teachers ?? [],
    subjects: data.subjects ?? [],
    activityTags: data.activityTags ?? [],
    students: data.students ?? [],
    activities: data.activities ?? [],
    rooms: data.rooms ?? [],
    timeConstraints: data.timeConstraints ?? [],
    spaceConstraints: data.spaceConstraints ?? [],
    timetable: tt,
    status: (row.status as Project["status"]) ?? "draft",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Every function below takes the id of the signed-in user and scopes its query
// by it. A project belonging to someone else is indistinguishable from one that
// does not exist, so callers can keep returning a plain 404 without leaking
// whether the id is real.

export async function listProjects(userId: string): Promise<Project[]> {
  const rows = await db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(rowToProject);
}

export async function getProject(
  id: string,
  userId: string
): Promise<Project | null> {
  const row = await db.project.findFirst({ where: { id, userId } });
  return row ? rowToProject(row) : null;
}

export async function createProject(
  project: Project,
  userId: string
): Promise<Project> {
  const {
    id: _id,
    timetable: _tt,
    status: _st,
    name: _n,
    createdAt: _c,
    updatedAt: _u,
    ...dataOnly
  } = project;
  const row = await db.project.create({
    data: {
      name: project.name,
      data: JSON.stringify(dataOnly),
      timetable: project.timetable ? JSON.stringify(project.timetable) : null,
      status: project.status,
      userId,
    },
  });
  return rowToProject(row);
}

export async function updateProject(
  id: string,
  project: Project,
  userId: string
): Promise<Project | null> {
  const {
    id: _id,
    timetable: _tt,
    status: _st,
    name: _n,
    createdAt: _c,
    updatedAt: _u,
    ...dataOnly
  } = project;
  try {
    const row = await db.project.update({
      where: { id, userId },
      data: {
        name: project.name,
        data: JSON.stringify(dataOnly),
        timetable: project.timetable ? JSON.stringify(project.timetable) : null,
        status: project.status,
      },
    });
    return rowToProject(row);
  } catch (e) {
    if (isRecordNotFound(e)) return null;
    throw e;
  }
}

export async function deleteProject(
  id: string,
  userId: string
): Promise<boolean> {
  try {
    await db.project.delete({ where: { id, userId } });
    return true;
  } catch (e) {
    if (isRecordNotFound(e)) return false;
    throw e;
  }
}

export async function setTimetable(
  id: string,
  timetable: Timetable | null,
  status: Project["status"],
  userId: string
): Promise<Project | null> {
  try {
    const row = await db.project.update({
      where: { id, userId },
      data: {
        timetable: timetable ? JSON.stringify(timetable) : null,
        status,
      },
    });
    return rowToProject(row);
  } catch (e) {
    if (isRecordNotFound(e)) return null;
    throw e;
  }
}
