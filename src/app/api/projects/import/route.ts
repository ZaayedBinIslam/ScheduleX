import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/lib/fet/projectService";
import { parseFetFile } from "@/lib/fet/importer";
import { type Project } from "@/lib/fet/types";
import { ProjectSchema } from "@/lib/fet/schema";

// POST /api/projects/import
// Accepts a .fet file content (raw text in the request body, or a `file`
// field in multipart form data) and creates a new project from it.
//
// Body options:
//   - Content-Type: text/plain  → raw .fet XML in body
//   - Content-Type: application/json → { "content": "<fet xml>", "name"?: "..." }
//   - multipart/form-data with a `file` field
export async function POST(req: NextRequest) {
  try {
    let content = "";
    let overrideName: string | undefined;
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file instanceof File) {
        content = await file.text();
        overrideName =
          (form.get("name") as string | null) ?? file.name.replace(/\.fet$/i, "");
      } else {
        return NextResponse.json(
          { error: "No 'file' field in form data" },
          { status: 400 }
        );
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      content = typeof body?.content === "string" ? body.content : "";
      overrideName = typeof body?.name === "string" ? body.name : undefined;
    } else {
      content = await req.text();
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Empty .fet content" },
        { status: 400 }
      );
    }

    const result = parseFetFile(content);
    const candidate: Project = {
      ...result.project,
      name: overrideName?.trim() || result.project.name || "Imported project",
    };

    const parsed = ProjectSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Imported project structure is invalid", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const saved = await createProject(parsed.data);
    return NextResponse.json(
      { project: saved, warnings: result.warnings, stats: result.stats },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: `Import failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
