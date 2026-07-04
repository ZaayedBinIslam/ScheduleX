// Seed a complete, valid timetable project via the API, then generate it.
// Run with: bun run seed.ts
import { newProject, type Project } from "./src/lib/fet/types";

const BASE = "http://127.0.0.1:3000";

async function main() {
  // 1. Create empty project
  const created = await fetch(`${BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Demo: Engineering Fall 2025" }),
  }).then((r) => r.json());
  const id = created.project.id;
  console.log("Created project:", id);

  // 2. Build a complete project
  const p: Project = newProject("Demo: Engineering Fall 2025");
  p.id = id;
  p.institution = {
    name: "State University of Technology",
    comments: "Seeded demo project for verification",
  };
  p.days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((n) => ({ name: n }));
  p.hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"].map((n) => ({ name: n }));

  p.teachers = [
    { id: "t1", name: "Dr. Ahmed" },
    { id: "t2", name: "Prof. Khan" },
    { id: "t3", name: "Dr. Rahman" },
    { id: "t4", name: "Ms. Sultana" },
  ];
  p.subjects = [
    { id: "s1", name: "Algorithms" },
    { id: "s2", name: "Data Structures" },
    { id: "s3", name: "Calculus" },
    { id: "s4", name: "Physics" },
    { id: "s5", name: "Programming Lab" },
  ];
  p.activityTags = [
    { id: "at1", name: "Theory" },
    { id: "at2", name: "Lab" },
  ];

  p.students = [
    {
      id: "y1",
      name: "Year 1",
      numberOfStudents: 120,
      groups: [
        {
          id: "g1",
          name: "Group 1A",
          numberOfStudents: 60,
          subgroups: [
            { id: "sg1", name: "1A.1", numberOfStudents: 30 },
            { id: "sg2", name: "1A.2", numberOfStudents: 30 },
          ],
        },
        {
          id: "g2",
          name: "Group 1B",
          numberOfStudents: 60,
          subgroups: [
            { id: "sg3", name: "1B.1", numberOfStudents: 30 },
            { id: "sg4", name: "1B.2", numberOfStudents: 30 },
          ],
        },
      ],
    },
  ];

  p.rooms = [
    { id: "r1", name: "Room 101", building: "Main", capacity: 60, virtual: false },
    { id: "r2", name: "Room 102", building: "Main", capacity: 40, virtual: false },
    { id: "r3", name: "Lab A", building: "Science", capacity: 30, virtual: false },
  ];

  // Activities: spread across teachers/subjects/subgroups
  let aid = 1;
  const acts = [
    { t: ["t1"], s: "s1", sg: ["sg1", "sg2"], d: 2, tag: ["at1"] },
    { t: ["t2"], s: "s2", sg: ["sg1"], d: 1, tag: ["at1"] },
    { t: ["t2"], s: "s2", sg: ["sg2"], d: 1, tag: ["at1"] },
    { t: ["t3"], s: "s3", sg: ["sg1", "sg2", "sg3", "sg4"], d: 1, tag: ["at1"] },
    { t: ["t3"], s: "s3", sg: ["sg3"], d: 1, tag: ["at1"] },
    { t: ["t4"], s: "s4", sg: ["sg3", "sg4"], d: 2, tag: ["at1"] },
    { t: ["t1"], s: "s5", sg: ["sg1"], d: 2, tag: ["at2"] },
    { t: ["t1"], s: "s5", sg: ["sg2"], d: 2, tag: ["at2"] },
    { t: ["t4"], s: "s5", sg: ["sg3"], d: 2, tag: ["at2"] },
    { t: ["t4"], s: "s5", sg: ["sg4"], d: 2, tag: ["at2"] },
    { t: ["t2"], s: "s1", sg: ["sg3", "sg4"], d: 2, tag: ["at1"] },
    { t: ["t3"], s: "s4", sg: ["sg1", "sg2"], d: 1, tag: ["at1"] },
  ];
  for (const a of acts) {
    p.activities.push({
      id: aid++,
      teachers: a.t,
      subject: a.s,
      activityTags: a.tag,
      students: a.sg,
      duration: a.d,
      totalDuration: a.d,
      activityGroupId: 0,
      isSplit: false,
      active: true,
      comments: "",
    });
  }

  // A couple of constraints
  p.timeConstraints.push({
    id: "tc1",
    type: "TeacherNotAvailable",
    weight: 100,
    teacherId: "t1",
    notAvailableTimes: [{ day: "Monday", hour: "08:00" }],
    active: true,
  });
  p.spaceConstraints.push({
    id: "sc1",
    type: "RoomNotAvailable",
    weight: 100,
    roomId: "r3",
    notAvailableTimes: [
      { day: "Friday", hour: "14:00" },
      { day: "Friday", hour: "15:00" },
    ],
    active: true,
  });

  // 3. Save full project
  const saved = await fetch(`${BASE}/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project: p }),
  }).then((r) => r.json());
  console.log("Saved. Status:", saved.project.status, "Activities:", saved.project.activities.length);

  // 4. Generate (force fallback since FET not installed)
  const gen = await fetch(`${BASE}/api/projects/${id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ forceFallback: true }),
  }).then((r) => r.json());

  if (gen.error) {
    console.error("Generation error:", gen.error);
    if (gen.issues) {
      for (const i of gen.issues) console.log(`  [${i.level}] ${i.message}`);
    }
    process.exit(1);
  }
  console.log("Generated. Engine:", gen.engine);
  console.log("Entries:", gen.project.timetable.entries.length);
  console.log("Unassigned:", gen.project.timetable.unassigned.length);
  console.log("Warnings:", gen.warnings);
  console.log("\nPROJECT_ID=" + id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
