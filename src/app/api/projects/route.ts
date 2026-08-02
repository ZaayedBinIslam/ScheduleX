import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { createProject, listProjects } from "@/lib/fet/projectService";
import { newProject, type Project } from "@/lib/fet/types";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const projects = await listProjects(userId);
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const name =
      typeof body?.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Untitled Project";
    const project: Project = newProject(name);
    const saved = await createProject(project, userId);
    return NextResponse.json({ project: saved }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
