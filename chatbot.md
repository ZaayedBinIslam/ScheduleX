# ScheduleX chatbot Reference Knowledge-Base

This file contains the complete system architecture, data models, set-up wizards, and generation flows of the **ScheduleX** university timetable scheduler. Use this documentation to provide correct and precise answers regarding the project's technical processes.

---

## 1. Project Overview & Core Concept
**ScheduleX** is an advanced university timetabling application. It allows academic schedulers to configure institutional structures (teachers, rooms, subjects, students, activities, and constraints), compile them into the XML-based input format of the **FET (Free Evolutionary Timetabling) engine**, invoke the FET command-line solver to generate conflict-free schedules, and fine-tune the resulting timetables via an interactive drag-and-drop grid.

---

## 2. System Architecture

### 2.1 Technology Stack
- **Framework**: Next.js (App Router, dynamic page structures).
- **Client SPA**: Single Page Application container embedded in the Next.js page shell. Uses `react-router-dom`'s `HashRouter` to prevent hydration mismatches and handle local navigation (e.g., `#` routing for project setup and grids).
- **State Management**: **Zustand** store (`src/lib/store.ts`) handles project creation, modifications, undo/redo states, and synchronization with backend APIs.
- **Database ORM**: Prisma Client mapped to a **MongoDB** cluster.
- **Solver Interface**: Node.js child processes wrapping native `fet-cl` executable binaries (with a fallback built-in greedy scheduler).

### 2.2 Data Flow Lifecycle
```
[User Input Wizard] ──(Zustand Store)──> [Next.js API Client]
                                                  │
                                                  ▼
[Prisma Client / MongoDB] <───────────── [Route Handlers]
         │
         ├──(Generation Trigger)────────> [FET XML Generator (.fet XML)]
         │                                        │
         │                                        ▼
         │                                [fet-cl Solver Binary]
         │                                        │
         │                                        ▼
[Timetable Entries (Prisma)] <───────── [FET XML Parser]
```

---

## 3. Database Schema (MongoDB / Prisma)

Prisma matches properties to a MongoDB document collection. The primary entity is the `Project` model:

```prisma
model Project {
  id        String   @id @default(cuid()) @map("_id")
  name      String
  data      String   // Serialized JSON containing all setup configurations (teachers, rooms, constraints, etc.)
  timetable String?  // Serialized JSON containing the generated schedule coordinates (entries, unassigned)
  status    String   @default("draft") // draft | ready | generating | generated | error
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([updatedAt])
}
```

- **JSON Document Storage**: Storing setup fields as a single JSON text block (`data`) matches the structure of native `.fet` files, simplifying database queries and preventing join bottlenecks.

---

## 4. The 8-Step Schedule Setup Process

Users construct their timetabling constraints sequentially using a guided wizard:

| Step | Component | Description & Process |
| :--- | :--- | :--- |
| **Step 1** | **Institution** (`StepInstitution.tsx`) | Captures basic project metadata (Project name, institution label) used in page headers and exported FET XML files. |
| **Step 2** | **Grid** (`StepGrid.tsx`) | Defines the temporal structure of the schedule. Schedulers select which days of the week are active (e.g., Monday-Friday) and define the periods/hour slots (e.g., 08:00, 09:00, 10:00). |
| **Step 3** | **Subjects** (`StepSubjects.tsx`) | Roster of courses (e.g., "Algorithms") and activity tags. Activity tags classify lessons (e.g., "Lab", "Lecture") to apply layout color codes and constraints. |
| **Step 4** | **Teachers** (`StepTeachers.tsx`) | Profiles teachers, sets target weekly workloads, lists qualified subjects, and uses an interactive grid (`TimeSlotGrid.tsx`) to mark specific hours where they are unavailable. |
| **Step 5** | **Students** (`StepStudents.tsx`) | Defines student bodies using a 3-tier hierarchy: **Years** (e.g., "1st Year") ➔ **Groups** (e.g., "Group A") ➔ **Subgroups** (e.g., "Subgroup A.1"), mapping specific student counts to each node. |
| **Step 6** | **Rooms** (`StepRooms.tsx`) | Catalog of physical classrooms, lecture theatres, and laboratories. Captures room names, building names, student capacity limits, and virtual flags (virtual rooms have infinite capacity). |
| **Step 7** | **Activities** (`StepActivities.tsx`) | The building blocks of scheduling. Links a **Teacher**, a **Subject**, a **Student Group/Subgroup**, lesson **Duration** (number of period blocks), and a **Preferred Room**. Supports splits (e.g., splitting a 4-hour class into two 2-hour sessions). |
| **Step 8** | **Constraints** (`StepConstraints.tsx`) | Configures advanced rules passed to the FET engine, including: **Time Constraints** (min days between activities, break times, teacher max hours per day) and **Space Constraints** (preferred rooms for specific teachers, subjects, or activity tags). |

---

## 5. The Timetable Generation Process

The generation flow occurs in the **Review** step (`StepReview.tsx`):

1. **Pre-flight Checks**: The platform runs validation algorithms on the local project data to highlight conflicts (e.g., an activity duration exceeding the number of periods in a day, or a group capacity exceeding the preferred room capacity).
2. **XML Export**: Upon trigger, the server compiles the database `data` JSON into a native `.fet` XML input file inside a temporary system folder.
3. **Solver Invocation**: The Next.js handler spawns a child process executing:
   - `fet-cl --inputfile=<temp_path.fet> --outputdir=<temp_dir> --timelimit=<user_limit>`
   - The user defines a timeout limit (e.g., 2 minutes) from the UI.
4. **Status Monitoring**:
   - The project status is set to `generating`.
   - The UI polls `/api/fet-status` to display a live elapsed timer, solver progress percentage, and generation metadata.
   - Schedulers can click the **"Stop"** button at any time, which sends a cancellation signal to terminate the solver process.
5. **Output Parsing**: Once the solver completes, the server reads the resulting `*_activities.xml` output file. The parser map converts xml elements into coordinates (`day`, `hour`, `room`) and writes the parsed timetable to the database under `timetable`, updating the project status to `generated`.

---

## 6. Interactive Timetable Grid & Conflict Checking

After generation, the schedule is loaded in `TimetablePage.tsx`.

### 6.1 View Modes
The grid allows filters to view schedules by:
- **Teacher View**: Shows the schedule grid of a selected instructor.
- **Room View**: Shows room occupancy grids (filtering out virtual rooms).
- **Student View**: Shows group or subgroup timetable cells.

### 6.2 Drag-and-Drop Manual Tuning (`@dnd-kit/core`)
- Users drag scheduled activity cards across cells to change their day or period.
- **Conflict-Free Highlighting**: While dragging an activity card, the grid scans candidate slots and highlights cells in green if the placement is conflict-free, or red if it violates scheduler rules.

### 6.3 Real-Time Validation Rules
The drag-and-drop checker (`src/lib/fet/timetable-utils.ts`) validates candidate movements in real-time against three main conflict vectors:
1. **Teacher Conflict**: Checks if the target teacher has another activity scheduled at the target timeslot (accounting for multi-period durations).
2. **Student Conflict**: Checks if the target student group/subgroup is already booked in another class during the target slot.
3. **Room Conflict**: Checks if the target classroom is occupied by another activity at the same time (excluding virtual rooms, which allow unlimited concurrency).

### 6.4 Activity Pinning / Locking
Schedulers can click the **Lock** icon on any activity card to pin it.
- **Locked** cards are excluded from manual drag movements unless explicitly unlocked.
- Pinning ensures that subsequent FET generation runs will preserve the coordinates of locked activities, allowing hybrid automatic-manual scheduling.

---

## 7. Import/Export Compatibility
- **Import (.fet)**: Schedulers can upload a native desktop FET XML file. The import handler parses the XML nodes into the database structure, enabling web-based editing.
- **Export (.fet)**: Schedulers can download their project configurations in standard `.fet` XML formats. This enables files to be opened and generated inside the desktop FET GUI application.
