# Authentication Integration Plan — ScheduleX

## Goal
Add secure user authentication (sign-in, registration, and API route protection) to the ScheduleX platform using NextAuth.js, Prisma, and MongoDB.

---

## 🏗️ Design Specifications

### 1. Database Schema Design
We will append the standard NextAuth schema models to `prisma/schema.prisma`. 
Because we use a MongoDB database, we must map all model primary keys (`id`) using `@map("_id")`:

```prisma
model User {
  id            String    @id @default(cuid()) @map("_id")
  name          String?
  email         String?   @unique
  passwordHash  String?   // For Credentials provider
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid()) @map("_id")
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid()) @map("_id")
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  id         String   @id @default(cuid()) @map("_id") // MongoDB requires all models to have a primary key mapped to _id
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

### 2. Authentication Flow & API Design

- **NextAuth Options (`src/lib/auth.ts`)**:
  - Configure the `PrismaAdapter` to synchronize profiles with MongoDB.
  - Implement a `CredentialsProvider` that accepts `email` and `password`.
  - Use `bcrypt` to compare the incoming password with the user's `passwordHash`.
  - Use a `jwt` session strategy to store session state in a signed client cookie, minimizing database query load.
  - Configure custom page routes: `pages: { signIn: "/login" }`.
- **API Endpoints**:
  - `/api/auth/[...nextauth]/route.ts` - Standard NextAuth endpoint (exports GET and POST handlers).
  - `/api/auth/register/route.ts` - Validates input with `zod`, hashes the password with `bcrypt`, creates the User in Prisma, and returns success/error.

### 3. UI/UX Flow & Client Architecture

- **Session Context**: Build a client-side wrapper `src/components/providers/SessionProvider.tsx` that exports NextAuth's `<SessionProvider>`, and wrap `{children}` in [layout.tsx](file:///f:/schedulex/ScheduleX/src/app/layout.tsx).
- **Authentication Pages**:
  - Create `/login` and `/register` routes or overlay screens.
  - Form validations via `react-hook-form` + `zod` schema resolver.
  - UI styled with Tailwind CSS 4, utilizing shadcn/ui `<Card>`, `<Input>`, `<Button>`, and `<Toast>` components.
- **Routing Guard**:
  - Protect client-side entry in [page.tsx](file:///f:/schedulex/ScheduleX/src/app/page.tsx). If the session is loading, show a loading pulse. If the session is missing, render the `<Login />` card instead of the main `<App />` layout.

---

## 📋 Implementation Tasks

- [ ] **Task 1: Install authentication dependencies**  
      Run: `npm install @next-auth/prisma-adapter bcrypt` and dev dependency `npm install -D @types/bcrypt`.  
      *Verify*: Inspect [package.json](file:///f:/schedulex/ScheduleX/package.json) to confirm new packages are added.

- [ ] **Task 2: Define Prisma schema models**  
      Add the `User`, `Account`, `Session`, and `VerificationToken` models to [schema.prisma](file:///f:/schedulex/ScheduleX/prisma/schema.prisma).  
      *Verify*: Run `npx prisma validate` and ensure no syntax or relation errors are found.

- [ ] **Task 3: Synchronize database and regenerate Prisma client**  
      Run: `npx prisma db push` followed by `npx prisma generate`.  
      *Verify*: Ensure console logs show Prisma client generation succeeded and that schemas/indexes are successfully pushed to MongoDB.

- [ ] **Task 4: Create NextAuth configuration module**  
      Create `src/lib/auth.ts` setting up credentials authorization, JWT token mappings, and password verification.  
      *Verify*: Run `npx tsc --noEmit` and confirm the file compiles without type errors.

- [ ] **Task 5: Create NextAuth handler endpoint**  
      Create the Next.js App Router route at `src/app/api/auth/[...nextauth]/route.ts` exporting GET and POST request handlers.  
      *Verify*: Query the server locally (`GET http://localhost:3000/api/auth/providers`) and verify it returns a list of configured providers.

- [ ] **Task 6: Create user registration endpoint**  
      Create `src/app/api/auth/register/route.ts` to validate payload, hash credentials using `bcrypt.hash(password, 10)`, check for duplicate emails, and create the user record.  
      *Verify*: Send a test POST request with new user details and verify the user is inserted in the MongoDB database via a Prisma lookup.

- [ ] **Task 7: Wrap layout in Session Provider**  
      Create `src/components/providers/SessionProvider.tsx` (`"use client"`) and import it to wrap `{children}` in [layout.tsx](file:///f:/schedulex/ScheduleX/src/app/layout.tsx).  
      *Verify*: Dev server compiles and starts without console errors.

- [ ] **Task 8: Implement authentication UI and guards**  
      Build beautiful, modern Login and Registration interfaces (styled to match ScheduleX aesthetics). Render login conditionally in [page.tsx](file:///f:/schedulex/ScheduleX/src/app/page.tsx) if no user session is present.  
      *Verify*: Access the site. Confirm that users must log in to access projects and that registration adds a new valid user.

- [ ] **Task 9: Secure project REST API routes**  
      Add authentication middleware checks using `getServerSession(authOptions)` inside `/api/projects/route.ts` and `/api/projects/[id]/route.ts`.  
      *Verify*: Verify that sending direct requests via curl without authentication returns `401 Unauthorized`.

---

## 🏁 Done When

- [ ] Users can securely register profiles and log in.
- [ ] Timetable workspace and generation controls are protected from unauthenticated access.
- [ ] API endpoints reject unauthorized CRUD and generation operations.
- [ ] The full timetabling generation round-trip still runs perfectly for logged-in users.
