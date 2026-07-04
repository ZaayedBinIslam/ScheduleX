"use client";

import { useProjectStore } from "@/lib/store";
import {
  StepHeader,
  AddButton,
  DeleteButton,
  EmptyRow,
} from "./shared";
import { Input } from "@/components/ui";
import { Users } from "lucide-react";
import { useMemo } from "react";

export function StepTeachers() {
  const project = useProjectStore((s) => s.project)!;
  const addTeacher = useProjectStore((s) => s.addTeacher);
  const updateTeacher = useProjectStore((s) => s.updateTeacher);
  const removeTeacher = useProjectStore((s) => s.removeTeacher);

  const teacherActivityCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of project.activities) {
      for (const t of a.teachers) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return map;
  }, [project.activities]);

  return (
    <div>
      <StepHeader
        title="Teachers"
        description="Add every teacher who can be assigned to activities. Teacher names must be unique."
        icon={<Users className="h-4 w-4" />}
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Teachers list</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.teachers.length} teacher(s)
            </p>
          </div>
          <AddButton onClick={addTeacher} label="Add teacher" />
        </div>
        <div className="space-y-2 p-4">
          {project.teachers.length === 0 ? (
            <EmptyRow
              message="No teachers yet. Add teachers who will lead activities."
              action={<AddButton onClick={addTeacher} label="Add teacher" />}
            />
          ) : (
            project.teachers.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
              >
                <Input
                  value={t.name}
                  onChange={(e) => updateTeacher(t.id, { name: e.target.value })}
                  placeholder="Teacher name (e.g. Dr. Ahmed)"
                  className="h-9"
                />
                <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                  {teacherActivityCount.get(t.id) ?? 0} activities
                </span>
                <DeleteButton onClick={() => removeTeacher(t.id)} />
              </div>
            ))
          )}
        </div>
      </div>

      {project.teachers.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> You can add the same
          teacher to multiple activities in step 6. FET will ensure a teacher is
          never double-booked.
        </div>
      )}
    </div>
  );
}
