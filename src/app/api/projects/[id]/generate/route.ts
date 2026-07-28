import { NextRequest, NextResponse } from "next/server";
import { getProject, setTimetable } from "@/lib/fet/projectService";
import { runGeneration } from "@/lib/fet/runner";
import { validateProject } from "@/lib/fet/validate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const forceFallback = Boolean(body?.forceFallback);
  const binaryPath = typeof body?.binaryPath === "string" ? body.binaryPath : undefined;
  const timeoutSeconds =
    typeof body?.timeoutSeconds === "number" && body.timeoutSeconds > 0
      ? body.timeoutSeconds
      : undefined;

  // Validate
  const issues = validateProject(project);
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length) {
    return NextResponse.json(
      {
        error: "Project has validation errors",
        issues,
      },
      { status: 400 }
    );
  }

  // Mark generating
  await setTimetable(id, null, "generating");

  try {
    const result = await runGeneration(project, {
      forceFallback,
      binaryPath,
      timeoutSeconds,
    });
    const updated = await setTimetable(id, result.timetable, "generated");
    return NextResponse.json({
      project: updated,
      engine: result.usedEngine,
      fetVersion: result.fetVersion,
      warnings: result.warnings,
      log: result.log,
      issues,
    });
  } catch (e) {
    await setTimetable(id, null, "error");
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
