"use client";

import { useProjectStore } from "@/lib/store";
import {
  StepHeader,
  Field,
  AddButton,
  DeleteButton,
  EmptyRow,
} from "./shared";
import { Input } from "@/components/ui";
import { CalendarDays, Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export function StepGrid() {
  const project = useProjectStore((s) => s.project)!;
  const setDays = useProjectStore((s) => s.setDays);
  const setHours = useProjectStore((s) => s.setHours);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const onDragEndDays = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = project.days.findIndex((d) => d.name === active.id);
    const newIndex = project.days.findIndex((d) => d.name === over.id);
    setDays(arrayMove(project.days, oldIndex, newIndex));
  };
  const onDragEndHours = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = project.hours.findIndex((h) => h.name === active.id);
    const newIndex = project.hours.findIndex((h) => h.name === over.id);
    setHours(arrayMove(project.hours, oldIndex, newIndex));
  };

  return (
    <div>
      <StepHeader
        title="Days & hours grid"
        description="Define the weekly grid: which days are teaching days and which period names (hours) each day has. Drag to reorder."
        icon={<CalendarDays className="h-4 w-4" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Days */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Days</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Teaching days of the week.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setDays([
                    { name: "Monday" },
                    { name: "Tuesday" },
                    { name: "Wednesday" },
                    { name: "Thursday" },
                    { name: "Friday" },
                  ])
                }
                className="text-xs text-primary hover:underline"
              >
                Mon–Fri
              </button>
              <AddButton
                onClick={() => setDays([...project.days, { name: "" }])}
                label="Add day"
              />
            </div>
          </div>
          <div className="space-y-2 p-4">
            {project.days.length === 0 ? (
              <EmptyRow message="No days yet. Add Mon–Fri in one click or add custom days." />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEndDays}
              >
                <SortableContext
                  items={project.days.map((d) => d.name)}
                  strategy={verticalListSortingStrategy}
                >
                  {project.days.map((d, i) => (
                    <SortableRow
                      key={i}
                      id={d.name || `day-${i}`}
                      value={d.name}
                      onChange={(v) =>
                        setDays(
                          project.days.map((x, j) =>
                            j === i ? { name: v } : x
                          )
                        )
                      }
                      onRemove={() =>
                        setDays(project.days.filter((_, j) => j !== i))
                      }
                      placeholder="Day name"
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Hours */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Hours / periods</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Period names per day (e.g. &ldquo;08:00&rdquo; or &ldquo;Period 1&rdquo;).
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setHours(
                    Array.from({ length: 8 }, (_, i) => ({
                      name: `${8 + i}:00`,
                    }))
                  )
                }
                className="text-xs text-primary hover:underline"
              >
                08–15
              </button>
              <AddButton
                onClick={() => setHours([...project.hours, { name: "" }])}
                label="Add hour"
              />
            </div>
          </div>
          <div className="space-y-2 p-4">
            {project.hours.length === 0 ? (
              <EmptyRow message="No periods yet. Add a standard 08:00–15:00 set or custom periods." />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEndHours}
              >
                <SortableContext
                  items={project.hours.map((h) => h.name)}
                  strategy={verticalListSortingStrategy}
                >
                  {project.hours.map((h, i) => (
                    <SortableRow
                      key={i}
                      id={h.name || `hour-${i}`}
                      value={h.name}
                      onChange={(v) =>
                        setHours(
                          project.hours.map((x, j) =>
                            j === i ? { name: v } : x
                          )
                        )
                      }
                      onRemove={() =>
                        setHours(project.hours.filter((_, j) => j !== i))
                      }
                      placeholder="Hour / period name"
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <p>
          <strong>Grid size:</strong> {project.days.length} days ×{" "}
          {project.hours.length} hours ={" "}
          {project.days.length * project.hours.length} slots per week.
        </p>
      </div>
    </div>
  );
}

function SortableRow({
  id,
  value,
  onChange,
  onRemove,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
  placeholder: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5",
        isDragging && "opacity-60 shadow-lg"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8"
      />
      <DeleteButton onClick={onRemove} />
    </div>
  );
}
