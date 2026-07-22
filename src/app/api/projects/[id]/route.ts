import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProject, updateProject } from "@/lib/fet/projectService";
import { ProjectSchema } from "@/lib/fet/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body?.project) {
    return NextResponse.json({ error: "Missing project body" }, { status: 400 });
  }

  const parsed = ProjectSchema.safeParse(body.project);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid project body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const project = parsed.data;
  project.id = id;
  const updated = await updateProject(id, project);
  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteProject(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
