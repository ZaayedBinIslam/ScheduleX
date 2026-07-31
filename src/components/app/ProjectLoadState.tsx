"use client";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/lib/store";

/**
 * What every project page shows before its project is in the store.
 *
 * The pages used to render a bare spinner whenever `project` was null, so a
 * failed load — the store catches those and only records `error` — left the
 * spinner up permanently with nothing on screen explaining why. Anything that
 * isn't "a load is currently in flight" now ends in a recoverable state.
 */
export function ProjectLoadState({ label = "Loading project…" }: { label?: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const loading = useProjectStore((s) => s.loading);
  const error = useProjectStore((s) => s.error);
  const load = useProjectStore((s) => s.load);

  // The load is kicked off by an effect in AppRoutes, so on the first render
  // there is legitimately no load in flight yet. Wait a beat before treating
  // that as a failure, otherwise every navigation flashes the error card.
  const [graceElapsed, setGraceElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGraceElapsed(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (loading || (!error && !graceElapsed)) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {label}
      </div>
    );
  }

  return (
    <div className="flex h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <h2 className="mb-1 text-lg font-semibold">Couldn&apos;t load this project</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {error ?? "The project didn't load. It may have been deleted, or the database may be unreachable."}
        </p>
        <div className="flex justify-center gap-2">
          {id && (
            <Button onClick={() => void load(id)} disabled={loading}>
              <RotateCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
