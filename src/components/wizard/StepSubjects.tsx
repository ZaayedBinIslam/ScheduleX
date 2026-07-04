"use client";

import { useProjectStore } from "@/lib/store";
import {
  StepHeader,
  AddButton,
  DeleteButton,
  EmptyRow,
} from "./shared";
import { Input } from "@/components/ui";
import { BookOpen, Tag } from "lucide-react";

export function StepSubjects() {
  const project = useProjectStore((s) => s.project)!;
  const addSubject = useProjectStore((s) => s.addSubject);
  const updateSubject = useProjectStore((s) => s.updateSubject);
  const removeSubject = useProjectStore((s) => s.removeSubject);
  const addTag = useProjectStore((s) => s.addActivityTag);
  const updateTag = useProjectStore((s) => s.updateActivityTag);
  const removeTag = useProjectStore((s) => s.removeActivityTag);

  return (
    <div>
      <StepHeader
        title="Subjects & activity tags"
        description="Subjects are what gets taught (Mathematics, Physics…). Activity tags classify activities (Theory, Lab, Tutorial…) and help constraints."
        icon={<BookOpen className="h-4 w-4" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subjects */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Subjects
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {project.subjects.length} subject(s)
              </p>
            </div>
            <AddButton onClick={addSubject} label="Add subject" />
          </div>
          <div className="space-y-2 p-4">
            {project.subjects.length === 0 ? (
              <EmptyRow
                message="No subjects yet."
                action={<AddButton onClick={addSubject} label="Add subject" />}
              />
            ) : (
              project.subjects.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <Input
                    value={s.name}
                    onChange={(e) =>
                      updateSubject(s.id, { name: e.target.value })
                    }
                    placeholder="Subject name (e.g. Algorithms)"
                    className="h-9"
                  />
                  <DeleteButton onClick={() => removeSubject(s.id)} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity tags */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Activity tags
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {project.activityTags.length} tag(s) · optional
              </p>
            </div>
            <AddButton onClick={addTag} label="Add tag" />
          </div>
          <div className="space-y-2 p-4">
            {project.activityTags.length === 0 ? (
              <EmptyRow
                message="No tags yet. Common tags: Theory, Lab, Tutorial, Seminar."
                action={<AddButton onClick={addTag} label="Add tag" />}
              />
            ) : (
              project.activityTags.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <Input
                    value={t.name}
                    onChange={(e) =>
                      updateTag(t.id, { name: e.target.value })
                    }
                    placeholder="Tag name (e.g. Lab)"
                    className="h-9"
                  />
                  <DeleteButton onClick={() => removeTag(t.id)} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
