import type { Project, Timetable, TimetableEntry } from "./types";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Parse the activities.xml file produced by fet-cli into a Timetable.
// FET outputs one or more XML files describing the scheduled activities.
// We search the output directory recursively for the activities XML.

interface ParsedActivity {
  id: number;
  day: string;
  hour: string;
  room: string;
  teachers: string[];
  subject: string;
  activityTags: string[];
  students: string[];
  duration: number;
}

export function parseFetOutput(outputDir: string, project: Project): {
  timetable: Timetable;
  warnings: string[];
} {
  const warnings: string[] = [];
  const file = findActivitiesFile(outputDir);
  if (!file) {
    warnings.push(
      "Could not find an activities XML file in the FET output directory."
    );
    return {
      timetable: {
        generatedAt: new Date().toISOString(),
        engine: "fet",
        entries: [],
        unassigned: project.activities
          .filter((a) => a.active)
          .map((a) => ({ activityId: a.id, reason: "No output from FET" })),
        warnings,
      },
      warnings,
    };
  }

  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (e) {
    warnings.push(`Failed to read activities file: ${(e as Error).message}`);
    return {
      timetable: emptyTimetable(project, warnings),
      warnings,
    };
  }

  const parsed = parseActivitiesXml(raw);

  // Merge scheduled times with original activity data
  const entries: TimetableEntry[] = parsed
    .map((pa) => {
      const orig = project.activities.find((a) => a.id === pa.id);
      if (!orig) return null;

      const teacherNames = orig.teachers
        .map((id) => project.teachers.find((t) => t.id === id)?.name)
        .filter(Boolean) as string[];

      const subjectName =
        project.subjects.find((s) => s.id === orig.subject)?.name ?? "";

      const activityTagNames = orig.activityTags
        .map((id) => project.activityTags.find((t) => t.id === id)?.name)
        .filter(Boolean) as string[];

      const studentNames = orig.students
        .map((id) => {
          for (const y of project.students) {
            if (y.id === id) return y.name;
            for (const g of y.groups) {
              if (g.id === id) return g.name;
              for (const s of g.subgroups) {
                if (s.id === id) return s.name;
              }
            }
          }
          return undefined;
        })
        .filter(Boolean) as string[];

      return {
        activityId: orig.id,
        teacherIds: orig.teachers,
        subjectId: orig.subject,
        activityTagIds: orig.activityTags,
        studentIds: orig.students,
        duration: orig.duration,
        day: pa.day,
        hour: pa.hour,
        room: pa.room,
        teacherNames,
        subjectName,
        activityTagNames,
        studentNames,
      };
    })
    .filter(Boolean) as TimetableEntry[];

  // Determine unassigned (active activities with no entry)
  const assignedIds = new Set(entries.map((e) => e.activityId));
  const unassigned = project.activities
    .filter((a) => a.active && !assignedIds.has(a.id))
    .map((a) => ({ activityId: a.id, reason: "Not scheduled by FET" }));

  return {
    timetable: {
      generatedAt: new Date().toISOString(),
      engine: "fet",
      entries,
      unassigned,
      warnings,
    },
    warnings,
  };
}

function emptyTimetable(project: Project, warnings: string[]): Timetable {
  return {
    generatedAt: new Date().toISOString(),
    engine: "fet",
    entries: [],
    unassigned: project.activities
      .filter((a) => a.active)
      .map((a) => ({ activityId: a.id, reason: "No output" })),
    warnings,
  };
}

// Search recursively for an activities XML file.
function findActivitiesFile(dir: string): string | null {
  try {
    const entries = readdirSync(dir);
    // Prefer "activities.xml"
    const direct = entries.find((e) => /^activities.*\.xml$/i.test(e));
    if (direct) return join(dir, direct);
    for (const e of entries) {
      const full = join(dir, e);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        const found = findActivitiesFile(full);
        if (found) return found;
      }
    }
    // fallback: any xml that contains <Activity>
    for (const e of entries) {
      if (/\.xml$/i.test(e)) {
        try {
          const content = readFileSync(join(dir, e), "utf8");
          if (content.includes("<Activity")) return join(dir, e);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

// A tolerant XML-ish parser for FET's activities file.
// FET's XML is simple enough that a regex/tag-walk works without a full DOM.
function parseActivitiesXml(xml: string): ParsedActivity[] {
  const out: ParsedActivity[] = [];
  const actRe = /<Activity>([\s\S]*?)<\/Activity>/g;
  let m: RegExpExecArray | null;
  while ((m = actRe.exec(xml)) !== null) {
    const block = m[1];
    const id = numTag(block, "Id") ?? 0;
    const day = textTag(block, "Day") ?? "";
    const hour = textTag(block, "Hour") ?? "";
    const room = textTag(block, "Room") ?? "";
    const subject = textTag(block, "Subject") ?? "";
    const duration = numTag(block, "Duration") ?? 1;
    const teachers = allTextTags(block, "Teacher");
    const tags = allTextTags(block, "Activity_Tag");
    const students = allTextTags(block, "Students");
    if (!day && !hour) continue; // unplaced activity
    out.push({
      id,
      day,
      hour,
      room,
      subject,
      duration,
      teachers,
      activityTags: tags,
      students,
    });
  }
  return out;
}

function textTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const m = re.exec(block);
  return m ? m[1].trim() : null;
}

function allTextTags(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    if (m[1].trim()) out.push(m[1].trim());
  }
  return out;
}

function numTag(block: string, tag: string): number | null {
  const t = textTag(block, tag);
  if (t == null) return null;
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}
