"use client";

import type { TimeSlot } from "@/lib/fet/types";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";

// A days × hours grid of toggle checkboxes for selecting time slots.
export function TimeSlotGrid({
  days,
  hours,
  value,
  onChange,
}: {
  days: string[];
  hours: string[];
  value: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
}) {
  if (!days.length || !hours.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        Add days and hours first (step 2).
      </div>
    );
  }

  const isSelected = (d: string, h: string) =>
    value.some((s) => s.day === d && s.hour === h);

  const toggle = (d: string, h: string) => {
    if (isSelected(d, h))
      onChange(value.filter((s) => !(s.day === d && s.hour === h)));
    else onChange([...value, { day: d, hour: h }]);
  };

  const toggleDay = (d: string) => {
    const allSelected = hours.every((h) => isSelected(d, h));
    if (allSelected) {
      onChange(value.filter((s) => s.day !== d));
    } else {
      const rest = value.filter((s) => s.day !== d);
      onChange([...rest, ...hours.map((h) => ({ day: d, hour: h }))]);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b border-r border-border bg-muted/50 px-2 py-1.5 text-left font-medium text-muted-foreground">
              Day \ Hour
            </th>
            {hours.map((h) => (
              <th
                key={h}
                className="border-b border-r border-border bg-muted/50 px-2 py-1.5 text-center font-medium text-muted-foreground last:border-r-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d}>
              <td className="sticky left-0 z-10 border-b border-r border-border bg-muted/30 px-2 py-1 font-medium">
                <button
                  type="button"
                  onClick={() => toggleDay(d)}
                  className="hover:underline"
                  title="Toggle whole day"
                >
                  {d}
                </button>
              </td>
              {hours.map((h) => {
                const sel = isSelected(d, h);
                return (
                  <td
                    key={h}
                    className="border-b border-r border-border p-0 last:border-r-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(d, h)}
                      className={cn(
                        "flex h-9 w-full items-center justify-center transition-colors",
                        sel
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "hover:bg-accent"
                      )}
                      title={`${d} ${h}`}
                    >
                      {sel ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3 w-3 text-muted-foreground/30" />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
