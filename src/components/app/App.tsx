"use client";

import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./Layout";
import { Dashboard } from "@/components/app/Dashboard";
import { ProjectWorkspace } from "@/components/app/ProjectWorkspace";
import { GeneratePage } from "@/components/app/GeneratePage";
import { TimetablePage } from "@/components/timetable/TimetablePage";
import { useEffect } from "react";
import { useProjectStore } from "@/lib/store";

export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}

function AppRoutes() {
  const location = useLocation();
  const load = useProjectStore((s) => s.load);
  const currentId = useProjectStore((s) => s.project?.id);

  // Auto-load the project from the URL if it isn't already loaded.
  const match = location.pathname.match(/^\/project\/([^/]+)/);
  const urlProjectId = match?.[1];
  useEffect(() => {
    if (urlProjectId && urlProjectId !== "new" && urlProjectId !== currentId) {
      load(urlProjectId);
    }
  }, [urlProjectId, currentId, load]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/new" element={<NewProjectRedirect />} />
        <Route path="/project/:id" element={<ProjectWorkspace />} />
        <Route path="/project/:id/generate" element={<GeneratePage />} />
        <Route path="/project/:id/timetable" element={<TimetablePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function NewProjectRedirect() {
  return <Navigate to="/" replace />;
}
