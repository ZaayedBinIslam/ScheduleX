import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/fet/projectService";
import { generateFetFile } from "@/lib/fet/generator";

// GET /api/projects/[id]/export
// Returns the project as a downloadable .fet file.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const xml = generateFetFile(project);
  const safeName = (project.institution.name || project.name || "timetable")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "timetable";

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.fet"`,
      "Cache-Control": "no-store",
    },
  });
}
