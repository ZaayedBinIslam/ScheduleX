"use client";

import { useProjectStore } from "@/lib/store";
import { StepHeader, Field, SectionCard } from "./shared";
import { Input, Textarea } from "@/components/ui";
import { Building2 } from "lucide-react";

export function StepInstitution() {
  const project = useProjectStore((s) => s.project)!;
  const setInstitution = useProjectStore((s) => s.setInstitution);
  const setName = useProjectStore((s) => s.setName);

  return (
    <div>
      <StepHeader
        title="Institution details"
        description="Tell FET about your institution. This becomes the title of every generated timetable."
        icon={<Building2 className="h-4 w-4" />}
      />

      <div className="space-y-4">
        <SectionCard title="Project name" description="Used in the dashboard and headings.">
          <Input
            value={project.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fall 2025 — Computer Science"
          />
        </SectionCard>

        <SectionCard title="Institution" description="Maps to Institution_Name in the .fet file.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Institution name">
              <Input
                value={project.institution.name}
                onChange={(e) =>
                  setInstitution(e.target.value, project.institution.comments)
                }
                placeholder="e.g. State University of Technology"
              />
            </Field>
            <Field label="Comments" hint="Optional notes shown in the FET file header.">
              <Textarea
                value={project.institution.comments}
                onChange={(e) =>
                  setInstitution(project.institution.name, e.target.value)
                }
                placeholder="e.g. Generated via ScheduleX"
                rows={2}
              />
            </Field>
          </div>
        </SectionCard>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="font-medium">Why this matters</p>
          <p className="mt-1 text-muted-foreground">
            The institution name and the day/hour grid (next step) define the
            backbone of every timetable. FET requires at least one day and one
            hour to generate a schedule.
          </p>
        </div>
      </div>
    </div>
  );
}
