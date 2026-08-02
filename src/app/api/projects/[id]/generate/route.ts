import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getProject, setTimetable } from "@/lib/fet/projectService";
import { GenerationCancelledError, runGeneration } from "@/lib/fet/runner";
import { cancelRun, clearRun, registerRun } from "@/lib/fet/runRegistry";
import { validateProject } from "@/lib/fet/validate";

/**
 * Status a project falls back to once a run is stopped. It passed validation to
 * get this far, and marking it "error" would claim a failure that never
 * happened.
 */
const STATUS_AFTER_STOP = "ready" as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id, userId);
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
  await setTimetable(id, null, "generating", userId);

  // Two independent ways in, because neither is reliable alone. req.signal fires
  // on this live handler when the client drops the request — that is what the
  // stop button leans on. The registry entry lets an explicit DELETE reach the
  // same controller, which also covers a client that is already gone.
  const controller = registerRun(id);
  const abortOnDisconnect = () => controller.abort();
  req.signal.addEventListener("abort", abortOnDisconnect, { once: true });

  try {
    const result = await runGeneration(project, {
      forceFallback,
      binaryPath,
      timeoutSeconds,
      signal: controller.signal,
    });
    const updated = await setTimetable(id, result.timetable, "generated", userId);
    return NextResponse.json({
      project: updated,
      engine: result.usedEngine,
      fetVersion: result.fetVersion,
      warnings: result.warnings,
      log: result.log,
      issues,
    });
  } catch (e) {
    if (e instanceof GenerationCancelledError) {
      await setTimetable(id, null, STATUS_AFTER_STOP, userId);
      // 499 is the usual "client closed request" code. The client may already be
      // gone, in which case this response is simply dropped.
      return NextResponse.json(
        { error: e.message, cancelled: true },
        { status: 499 }
      );
    }
    await setTimetable(id, null, "error", userId);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  } finally {
    req.signal.removeEventListener("abort", abortOnDisconnect);
    clearRun(id, controller);
  }
}

/** Stop the generation currently running for this project. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  // Confirm the caller owns this project before touching the run registry,
  // which is keyed by project id alone and would otherwise let any signed-in
  // user stop someone else's generation.
  const project = await getProject(id, userId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const stopped = cancelRun(id);
  if (stopped) {
    // The POST handler resets the status as it unwinds, so leave it alone here.
    return NextResponse.json({ stopped: true });
  }

  // Nothing was running. If the project still says "generating" the run died
  // with the server that owned it, so clear the flag rather than leaving the
  // project stuck in a state nothing can move it out of.
  if (project.status === "generating") {
    await setTimetable(id, null, STATUS_AFTER_STOP, userId);
  }
  return NextResponse.json({ stopped: false });
}
