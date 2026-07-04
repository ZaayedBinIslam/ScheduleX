"use client";

import { create } from "zustand";
import {
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
  fetchFetStatus,
  fetchProject,
  saveProject,
} from "@/lib/api";
import {
  newProject,
  type Activity,
  type Project,
  type Room,
  type SpaceConstraint,
  type StudentGroup,
  type StudentYear,
  type Subgroup,
  type Subject,
  type Teacher,
  type TimeConstraint,
  type Timetable,
} from "@/lib/fet/types";
import { uid } from "@/lib/fet/resolve";

type EntityId = string;

interface ProjectState {
  // The project currently loaded in the editor (null = not loaded)
  project: Project | null;
  dirty: boolean;
  saving: boolean;
  loading: boolean;
  error: string | null;
  // FET engine status
  fetAvailable: boolean | null; // null = unknown
  fetPath: string | null;
  fetVersion: string | null;

  load: (id: string) => Promise<Project | null>;
  createNew: (name: string) => Promise<Project>;
  reset: () => void;
  save: () => Promise<Project | null>;
  setError: (e: string | null) => void;

  setProjectField: <K extends keyof Project>(key: K, value: Project[K]) => void;
  setName: (name: string) => void;
  setInstitution: (name: string, comments: string) => void;
  setDays: (days: Project["days"]) => void;
  setHours: (hours: Project["hours"]) => void;
  setTimetable: (tt: Timetable | null) => void;

  // Teachers
  addTeacher: () => void;
  updateTeacher: (id: EntityId, patch: Partial<Teacher>) => void;
  removeTeacher: (id: EntityId) => void;

  // Subjects
  addSubject: () => void;
  updateSubject: (id: EntityId, patch: Partial<Subject>) => void;
  removeSubject: (id: EntityId) => void;

  // Activity tags
  addActivityTag: () => void;
  updateActivityTag: (id: EntityId, patch: Partial<{ name: string }>) => void;
  removeActivityTag: (id: EntityId) => void;

  // Students
  addYear: () => void;
  updateYear: (id: EntityId, patch: Partial<StudentYear>) => void;
  removeYear: (id: EntityId) => void;
  addGroup: (yearId: EntityId) => void;
  updateGroup: (yearId: EntityId, groupId: EntityId, patch: Partial<StudentGroup>) => void;
  removeGroup: (yearId: EntityId, groupId: EntityId) => void;
  addSubgroup: (yearId: EntityId, groupId: EntityId) => void;
  updateSubgroup: (yearId: EntityId, groupId: EntityId, sgId: EntityId, patch: Partial<Subgroup>) => void;
  removeSubgroup: (yearId: EntityId, groupId: EntityId, sgId: EntityId) => void;

  // Activities
  addActivity: (partial?: Partial<Activity>) => number;
  updateActivity: (id: number, patch: Partial<Activity>) => void;
  removeActivity: (id: number) => void;
  nextActivityId: () => number;

  // Rooms
  addRoom: () => void;
  updateRoom: (id: EntityId, patch: Partial<Room>) => void;
  removeRoom: (id: EntityId) => void;

  // Constraints
  addTimeConstraint: (c: TimeConstraint) => void;
  updateTimeConstraint: (id: EntityId, patch: Partial<TimeConstraint>) => void;
  removeTimeConstraint: (id: EntityId) => void;
  addSpaceConstraint: (c: SpaceConstraint) => void;
  updateSpaceConstraint: (id: EntityId, patch: Partial<SpaceConstraint>) => void;
  removeSpaceConstraint: (id: EntityId) => void;

  refreshFetStatus: () => Promise<void>;
}

function touch(p: Project): Project {
  return { ...p, updatedAt: new Date().toISOString() };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  dirty: false,
  saving: false,
  loading: false,
  error: null,
  fetAvailable: null,
  fetPath: null,
  fetVersion: null,

  load: async (id) => {
    set({ loading: true, error: null });
    try {
      const project = await fetchProject(id);
      set({ project, loading: false, dirty: false });
      return project;
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      return null;
    }
  },

  createNew: async (name) => {
    const project = await apiCreateProject(name);
    set({ project, dirty: false });
    return project;
  },

  reset: () => set({ project: null, dirty: false, error: null }),

  save: async () => {
    const { project } = get();
    if (!project) return null;
    set({ saving: true, error: null });
    try {
      const saved = await saveProject(project);
      set({ project: saved, saving: false, dirty: false });
      return saved;
    } catch (e) {
      set({ saving: false, error: (e as Error).message });
      return null;
    }
  },

  setError: (e) => set({ error: e }),

  setProjectField: (key, value) =>
    set((s) =>
      s.project
        ? { project: { ...touch(s.project), [key]: value }, dirty: true }
        : s
    ),

  setName: (name) =>
    set((s) =>
      s.project
        ? { project: { ...touch(s.project), name }, dirty: true }
        : s
    ),

  setInstitution: (name, comments) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              institution: { name, comments },
            },
            dirty: true,
          }
        : s
    ),

  setDays: (days) =>
    set((s) =>
      s.project ? { project: { ...touch(s.project), days }, dirty: true } : s
    ),

  setHours: (hours) =>
    set((s) =>
      s.project ? { project: { ...touch(s.project), hours }, dirty: true } : s
    ),

  setTimetable: (tt) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              timetable: tt,
              status: tt ? "generated" : s.project.status,
            },
            dirty: true,
          }
        : s
    ),

  // ---- Teachers ----
  addTeacher: () =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              teachers: [
                ...s.project.teachers,
                { id: uid("t_"), name: "" },
              ],
            },
            dirty: true,
          }
        : s
    ),
  updateTeacher: (id, patch) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              teachers: s.project.teachers.map((t) =>
                t.id === id ? { ...t, ...patch } : t
              ),
            },
            dirty: true,
          }
        : s
    ),
  removeTeacher: (id) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              teachers: s.project.teachers.filter((t) => t.id !== id),
              // also drop from activities
              activities: s.project.activities.map((a) => ({
                ...a,
                teachers: a.teachers.filter((tid) => tid !== id),
              })),
            },
            dirty: true,
          }
        : s
    ),

  // ---- Subjects ----
  addSubject: () =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              subjects: [...s.project.subjects, { id: uid("s_"), name: "" }],
            },
            dirty: true,
          }
        : s
    ),
  updateSubject: (id, patch) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              subjects: s.project.subjects.map((x) =>
                x.id === id ? { ...x, ...patch } : x
              ),
            },
            dirty: true,
          }
        : s
    ),
  removeSubject: (id) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              subjects: s.project.subjects.filter((x) => x.id !== id),
              activities: s.project.activities.map((a) =>
                a.subject === id ? { ...a, subject: "" } : a
              ),
            },
            dirty: true,
          }
        : s
    ),

  // ---- Activity tags ----
  addActivityTag: () =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              activityTags: [
                ...s.project.activityTags,
                { id: uid("at_"), name: "" },
              ],
            },
            dirty: true,
          }
        : s
    ),
  updateActivityTag: (id, patch) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              activityTags: s.project.activityTags.map((x) =>
                x.id === id ? { ...x, ...patch } : x
              ),
            },
            dirty: true,
          }
        : s
    ),
  removeActivityTag: (id) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              activityTags: s.project.activityTags.filter((x) => x.id !== id),
              activities: s.project.activities.map((a) => ({
                ...a,
                activityTags: a.activityTags.filter((tid) => tid !== id),
              })),
            },
            dirty: true,
          }
        : s
    ),

  // ---- Students ----
  addYear: () =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              students: [
                ...s.project.students,
                { id: uid("y_"), name: "", numberOfStudents: 0, groups: [] },
              ],
            },
            dirty: true,
          }
        : s
    ),
  updateYear: (id, patch) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              students: s.project.students.map((y) =>
                y.id === id ? { ...y, ...patch } : y
              ),
            },
            dirty: true,
          }
        : s
    ),
  removeYear: (id) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              students: s.project.students.filter((y) => y.id !== id),
            },
            dirty: true,
          }
        : s
    ),
  addGroup: (yearId) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              students: s.project.students.map((y) =>
                y.id === yearId
                  ? {
                      ...y,
                      groups: [
                        ...y.groups,
                        {
                          id: uid("g_"),
                          name: "",
                          numberOfStudents: 0,
                          subgroups: [],
                        },
                      ],
                    }
                  : y
              ),
            },
            dirty: true,
          }
        : s
    ),
  updateGroup: (yearId, groupId, patch) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              students: s.project.students.map((y) =>
                y.id === yearId
                  ? {
                      ...y,
                      groups: y.groups.map((g) =>
                        g.id === groupId ? { ...g, ...patch } : g
                      ),
                    }
                  : y
              ),
            },
            dirty: true,
          }
        : s
    ),
  removeGroup: (yearId, groupId) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              students: s.project.students.map((y) =>
                y.id === yearId
                  ? { ...y, groups: y.groups.filter((g) => g.id !== groupId) }
                  : y
              ),
            },
            dirty: true,
          }
        : s
    ),
  addSubgroup: (yearId, groupId) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              students: s.project.students.map((y) =>
                y.id === yearId
                  ? {
                      ...y,
                      groups: y.groups.map((g) =>
                        g.id === groupId
                          ? {
                              ...g,
                              subgroups: [
                                ...g.subgroups,
                                {
                                  id: uid("sg_"),
                                  name: "",
                                  numberOfStudents: 0,
                                },
                              ],
                            }
                          : g
                      ),
                    }
                  : y
              ),
            },
            dirty: true,
          }
        : s
    ),
  updateSubgroup: (yearId, groupId, sgId, patch) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              students: s.project.students.map((y) =>
                y.id === yearId
                  ? {
                      ...y,
                      groups: y.groups.map((g) =>
                        g.id === groupId
                          ? {
                              ...g,
                              subgroups: g.subgroups.map((sg) =>
                                sg.id === sgId ? { ...sg, ...patch } : sg
                              ),
                            }
                          : g
                      ),
                    }
                  : y
              ),
            },
            dirty: true,
          }
        : s
    ),
  removeSubgroup: (yearId, groupId, sgId) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              students: s.project.students.map((y) =>
                y.id === yearId
                  ? {
                      ...y,
                      groups: y.groups.map((g) =>
                        g.id === groupId
                          ? {
                              ...g,
                              subgroups: g.subgroups.filter(
                                (sg) => sg.id !== sgId
                              ),
                            }
                          : g
                      ),
                    }
                  : y
              ),
              activities: s.project.activities.map((a) => ({
                ...a,
                students: a.students.filter((sid) => sid !== sgId),
              })),
            },
            dirty: true,
          }
        : s
    ),

  // ---- Activities ----
  nextActivityId: () => {
    const p = get().project;
    if (!p) return 1;
    return p.activities.reduce((m, a) => Math.max(m, a.id), 0) + 1;
  },
  addActivity: (partial) => {
    const id = get().nextActivityId();
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              activities: [
                ...s.project.activities,
                {
                  id,
                  teachers: [],
                  subject: "",
                  activityTags: [],
                  students: [],
                  duration: 1,
                  totalDuration: 1,
                  activityGroupId: 0,
                  isSplit: false,
                  active: true,
                  comments: "",
                  ...partial,
                },
              ],
            },
            dirty: true,
          }
        : s
    );
    return id;
  },
  updateActivity: (id, patch) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              activities: s.project.activities.map((a) =>
                a.id === id ? { ...a, ...patch } : a
              ),
            },
            dirty: true,
          }
        : s
    ),
  removeActivity: (id) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              activities: s.project.activities.filter((a) => a.id !== id),
            },
            dirty: true,
          }
        : s
    ),

  // ---- Rooms ----
  addRoom: () =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              rooms: [
                ...s.project.rooms,
                {
                  id: uid("r_"),
                  name: "",
                  building: "",
                  capacity: 30,
                  virtual: false,
                },
              ],
            },
            dirty: true,
          }
        : s
    ),
  updateRoom: (id, patch) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              rooms: s.project.rooms.map((r) =>
                r.id === id ? { ...r, ...patch } : r
              ),
            },
            dirty: true,
          }
        : s
    ),
  removeRoom: (id) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              rooms: s.project.rooms.filter((r) => r.id !== id),
            },
            dirty: true,
          }
        : s
    ),

  // ---- Constraints ----
  addTimeConstraint: (c) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              timeConstraints: [...s.project.timeConstraints, c],
            },
            dirty: true,
          }
        : s
    ),
  updateTimeConstraint: (id, patch) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              timeConstraints: s.project.timeConstraints.map((c) =>
                c.id === id ? { ...c, ...patch } : c
              ),
            },
            dirty: true,
          }
        : s
    ),
  removeTimeConstraint: (id) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              timeConstraints: s.project.timeConstraints.filter(
                (c) => c.id !== id
              ),
            },
            dirty: true,
          }
        : s
    ),
  addSpaceConstraint: (c) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              spaceConstraints: [...s.project.spaceConstraints, c],
            },
            dirty: true,
          }
        : s
    ),
  updateSpaceConstraint: (id, patch) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              spaceConstraints: s.project.spaceConstraints.map((c) =>
                c.id === id ? { ...c, ...patch } : c
              ),
            },
            dirty: true,
          }
        : s
    ),
  removeSpaceConstraint: (id) =>
    set((s) =>
      s.project
        ? {
            project: {
              ...touch(s.project),
              spaceConstraints: s.project.spaceConstraints.filter(
                (c) => c.id !== id
              ),
            },
            dirty: true,
          }
        : s
    ),

  refreshFetStatus: async () => {
    try {
      const status = await fetchFetStatus();
      set({
        fetAvailable: status.available,
        fetPath: status.path,
        fetVersion: status.version,
      });
    } catch {
      set({ fetAvailable: false });
    }
  },
}));

export function makeTeacher(): Teacher {
  return { id: uid("t_"), name: "" };
}
export function makeSubject(): Subject {
  return { id: uid("s_"), name: "" };
}
