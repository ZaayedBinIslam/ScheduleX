"use client";

import { useProjectStore } from "@/lib/store";
import {
  StepHeader,
  AddButton,
  DeleteButton,
  EmptyRow,
  NumberInput,
  Field,
} from "./shared";
import { Input, Switch, Label } from "@/components/ui";
import { DoorOpen } from "lucide-react";
import { useFocusOnAdd } from "./useFocusOnAdd";

export function StepRooms() {
  const project = useProjectStore((s) => s.project)!;
  const addRoom = useProjectStore((s) => s.addRoom);
  const updateRoom = useProjectStore((s) => s.updateRoom);
  const removeRoom = useProjectStore((s) => s.removeRoom);

  const { containerRef, handleAdd } = useFocusOnAdd(project.rooms.length);

  const realRooms = project.rooms.filter((r) => !r.virtual);

  return (
    <div>
      <StepHeader
        title="Rooms"
        description="Add physical rooms/buildings with capacities. FET uses capacity to match rooms to activities, and avoids double-booking a room."
        icon={<DoorOpen className="h-4 w-4" />}
      />

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Rooms</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {realRooms.length} real room(s)
            </p>
          </div>
          <AddButton onClick={() => handleAdd(addRoom)} label="Add room" />
        </div>
        <div ref={containerRef} className="space-y-2 p-4">
          {project.rooms.length === 0 ? (
            <EmptyRow
              message="No rooms yet. Add classrooms, labs, lecture halls…"
              action={<AddButton onClick={() => handleAdd(addRoom)} label="Add room" />}
            />
          ) : (
            <>
              {/* header row (desktop) */}
              <div className="hidden gap-3 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_140px_90px_100px_44px]">
                <span>Room name</span>
                <span>Building</span>
                <span>Capacity</span>
                <span>Virtual</span>
                <span></span>
              </div>
              {project.rooms.map((r) => (
                <div
                  key={r.id}
                  className="grid gap-2 rounded-lg border border-border bg-background p-2.5 sm:grid-cols-[1fr_140px_90px_100px_44px] sm:items-center"
                >
                  <Input
                    data-row-input
                    value={r.name}
                    onChange={(e) => updateRoom(r.id, { name: e.target.value })}
                    placeholder="e.g. Room 101 / Lab A"
                    className="h-9"
                  />
                  <Input
                    value={r.building}
                    onChange={(e) =>
                      updateRoom(r.id, { building: e.target.value })
                    }
                    placeholder="Building"
                    className="h-9"
                  />
                  <NumberInput
                    value={r.capacity}
                    onChange={(v) => updateRoom(r.id, { capacity: v })}
                    min={0}
                    className="h-9"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.virtual}
                      onCheckedChange={(c) => updateRoom(r.id, { virtual: c })}
                      id={`v-${r.id}`}
                    />
                    <Label
                      htmlFor={`v-${r.id}`}
                      className="text-xs text-muted-foreground sm:hidden"
                    >
                      Virtual
                    </Label>
                  </div>
                  <DeleteButton onClick={() => removeRoom(r.id)} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Capacity tip:</strong> The
          scheduler picks the smallest room that fits an activity&apos;s student
          count. Set capacity honestly to avoid impossible placements.
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Virtual rooms:</strong> Mark a
          room as virtual to exclude it from real allocation (useful for
          assembly or break slots).
        </div>
      </div>
    </div>
  );
}
