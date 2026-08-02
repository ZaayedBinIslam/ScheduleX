"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useProjectStore } from "@/lib/store";
import { CalendarClock } from "lucide-react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

// Load the router-wrapped app only on the client to avoid SSR access to
// `document`/`window` from react-router-dom's HashRouter.
const App = dynamic(
  () => import("@/components/app/App").then((m) => m.App),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <CalendarClock className="h-8 w-8 animate-pulse text-primary" />
        <p className="text-sm">Loading ScheduleX…</p>
      </div>
    ),
  }
);

export default function Home() {
  const refreshFetStatus = useProjectStore((s) => s.refreshFetStatus);
  const { data: session, status } = useSession();

  useEffect(() => {
    refreshFetStatus();
  }, [refreshFetStatus]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <CalendarClock className="h-8 w-8 animate-pulse text-primary" />
        <p className="text-sm">Loading...</p>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return <App />;
}
