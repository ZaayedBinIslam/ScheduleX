import { db } from "@/lib/db";
import type { Project, Timetable } from "./types";

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

export async function listProjects(): Promise<Project[]> {
  const rows = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(rowToProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const row = await db.project.findUnique({ where: { id } });
  return row ? rowToProject(row) : null;
}

export async function createProject(project: Project): Promise<Project> {
  const { id, ...rest } = project;
  const row = await db.project.create({
    data: {
      name: project.name,
      data: JSON.stringify(rest),
      timetable: project.timetable ? JSON.stringify(project.timetable) : null,
      status: project.status,
    },
  });
  return rowToProject(row);
}

export async function updateProject(
  id: string,
  project: Project
): Promise<Project | null> {
  const { id: _omit, ...rest } = project;
  try {
    const row = await db.project.update({
      where: { id },
      data: {
        name: project.name,
        data: JSON.stringify(rest),
        timetable: project.timetable ? JSON.stringify(project.timetable) : null,
        status: project.status,
      },
    });
    return rowToProject(row);
  } catch {
    return null;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    await db.project.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function setTimetable(
  id: string,
  timetable: Timetable | null,
  status: Project["status"]
): Promise<Project | null> {
  try {
    const row = await db.project.update({
      where: { id },
      data: {
        timetable: timetable ? JSON.stringify(timetable) : null,
        status,
      },
    });
    return rowToProject(row);
  } catch {
    return null;
  }
}
