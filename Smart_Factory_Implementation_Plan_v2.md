# Smart Factory Operations Platform
## Implementation Plan — v2.0 (Task-Based)

---

## Confirmed Scope

1. Authentication & RBAC
2. Multi-tenant architecture (multiple owners, multiple factories)
3. Factory switcher (owner profile dropdown)
4. Production tracking
5. Live dashboard
6. Shift management
7. Basic attendance
8. Machine status & monitoring
9. Notifications & alerts
10. Production reporting
11. Gemini AI — shift digest
12. AI chat — Text-to-SQL

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, ShadCN UI |
| Routing | React Router v6 |
| Server state | React Query (TanStack Query v5) |
| Client state | Zustand |
| API client | Axios |
| Real-time | Socket.IO client |
| Backend | Node.js, Express.js |
| Real-time server | Socket.IO |
| Validation | Zod |
| Auth | JWT (RS256), bcrypt |
| ORM | Prisma |
| Database | PostgreSQL (Supabase / Neon) |
| AI | Gemini 1.5 Flash (digest + Text-to-SQL chat) |
| Report export | PDFKit (PDF), ExcelJS (Excel) |
| Frontend deploy | Vercel (static) |
| Backend deploy | Render |
| Database hosting | Supabase / Neon |

---

## Folder Structure

### Backend

```
/backend
├── src/
│   ├── config/
│   │   ├── db.js                  # Prisma client instance
│   │   ├── env.js                 # Env variable validation
│   │   └── socket.js              # Socket.IO instance (exported)
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT verify → attach req.user
│   │   ├── rbac.middleware.js     # requireRole() guard + X-Factory-ID resolution
│   │   ├── validate.js            # Zod request body/query validation
│   │   └── errorHandler.js       # Global error handler
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   └── auth.service.js
│   │   ├── factories/
│   │   │   ├── factory.routes.js
│   │   │   ├── factory.controller.js
│   │   │   └── factory.service.js
│   │   ├── production/
│   │   │   ├── production.routes.js
│   │   │   ├── production.controller.js
│   │   │   ├── production.service.js
│   │   │   └── production.schema.js   # Zod schemas
│   │   ├── shifts/
│   │   │   ├── shift.routes.js
│   │   │   ├── shift.controller.js
│   │   │   └── shift.service.js
│   │   ├── machines/
│   │   │   ├── machine.routes.js
│   │   │   ├── machine.controller.js
│   │   │   └── machine.service.js
│   │   ├── attendance/
│   │   │   ├── attendance.routes.js
│   │   │   ├── attendance.controller.js
│   │   │   └── attendance.service.js
│   │   ├── notifications/
│   │   │   ├── notification.routes.js
│   │   │   ├── notification.controller.js
│   │   │   └── notification.service.js
│   │   ├── reports/
│   │   │   ├── report.routes.js
│   │   │   ├── report.controller.js
│   │   │   └── report.service.js
│   │   ├── query/
│   │   │   ├── query.routes.js        # POST /query/ask
│   │   │   ├── query.controller.js
│   │   │   └── query.service.js       # Text-to-SQL pipeline
│   │   └── alerts/
│   │       └── alert.engine.js        # Threshold checks after every write
│   ├── services/
│   │   └── ai.service.js              # Gemini shift digest
│   └── app.js                         # Express app + middleware stack
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── .env
└── server.js                          # HTTP + Socket.IO bootstrap
```

### Frontend

```
/frontend
├── index.html
├── vite.config.ts
├── src/
│   ├── main.tsx                       # App entry — BrowserRouter + providers
│   ├── App.tsx                        # Route definitions
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── FactorySelect.tsx          # Owner landing — all factories overview
│   │   ├── Dashboard.tsx              # Live KPI dashboard
│   │   ├── Production.tsx             # Production list + update form
│   │   ├── Machines.tsx               # Machine status grid
│   │   ├── Attendance.tsx             # Shift attendance
│   │   ├── Reports.tsx                # Report generator + export
│   │   └── Notifications.tsx         # Notification feed
│   ├── components/
│   │   ├── ui/                        # ShadCN components
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx          # Sidebar + navbar wrapper
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── FactorySwitcher.tsx    # Owner profile dropdown
│   │   ├── dashboard/
│   │   │   ├── KPICard.tsx
│   │   │   ├── ProductionLineGrid.tsx
│   │   │   ├── AlertFeed.tsx
│   │   │   ├── ShiftCard.tsx          # Summary + AI digest
│   │   │   └── FactoryChat.tsx        # Text-to-SQL chat widget
│   │   ├── production/
│   │   │   ├── ProductionUpdateForm.tsx
│   │   │   └── TargetAssignForm.tsx
│   │   ├── machines/
│   │   │   ├── MachineStatusCard.tsx
│   │   │   └── FaultLogForm.tsx
│   │   ├── attendance/
│   │   │   ├── AttendanceRoster.tsx   # Supervisor: mark status for whole shift roster
│   │   │   └── SelfCheckInButton.tsx  # Operator: check in/out for own shift only
│   │   └── shared/
│   │       ├── ProtectedRoute.tsx     # Route guard (auth + role check)
│   │       └── RoleGuard.tsx          # Inline role-based render guard
│   ├── hooks/
│   │   ├── useSocket.ts               # Socket.IO connection + factory room
│   │   ├── useAuth.ts                 # Auth state helpers
│   │   └── useAlerts.ts              # Real-time alert subscription
│   ├── lib/
│   │   ├── api.ts                     # Axios instance with interceptors
│   │   ├── socket.ts                  # Socket.IO client init
│   │   └── queryClient.ts             # React Query client config
│   ├── store/
│   │   └── auth.store.ts              # Zustand: user, factories[], activeFactory
│   └── types/
│       └── index.ts                   # Shared TypeScript types
```

---

## Routing (React Router v6)

```tsx
// src/main.tsx
<BrowserRouter>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</BrowserRouter>

// src/App.tsx
<Routes>
  <Route path="/login" element={<Login />} />

  {/* Owner factory selection screen */}
  <Route element={<ProtectedRoute />}>
    <Route path="/factories" element={<FactorySelect />} />
  </Route>

  {/* All app pages — require auth + active factory */}
  <Route element={<ProtectedRoute requireFactory />}>
    <Route element={<AppLayout />}>
      <Route path="/dashboard"     element={<Dashboard />} />
      <Route path="/production"    element={<Production />} />
      <Route path="/machines"      element={<Machines />} />
      <Route path="/attendance"    element={<Attendance />} />
      <Route path="/reports"       element={<Reports />} />
      <Route path="/notifications" element={<Notifications />} />
    </Route>
  </Route>

  <Route path="*" element={<Navigate to="/login" />} />
</Routes>
```

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────

enum Role {
  OWNER
  MANAGER
  SUPERVISOR
  OPERATOR
}

enum ShiftType {
  MORNING
  AFTERNOON
  NIGHT
}

enum ShiftStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

enum MachineStatus {
  ACTIVE
  IDLE
  FAULT
  MAINTENANCE
}

enum MaintenanceType {
  CORRECTIVE
  PREVENTIVE
}

enum AlertType {
  LOW_PRODUCTION
  HIGH_REJECTION
  MACHINE_FAULT
  MACHINE_IDLE
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
}

// ─── Models ──────────────────────────────────────

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  factories      UserFactory[]
  supervisedShifts Shift[]
  productionLogs Production[]
  machineReports MaintenanceLog[]
  attendance     Attendance[]
}

model Factory {
  id        String   @id @default(uuid())
  name      String
  location  String?
  createdAt DateTime @default(now())

  members       UserFactory[]
  shifts        Shift[]
  machines      Machine[]
  notifications Notification[]
  alertConfig   AlertConfig?
  lines         ProductionLine[]
}

model UserFactory {
  id        String   @id @default(uuid())
  userId    String
  factoryId String
  role      Role
  isActive  Boolean  @default(true)
  joinedAt  DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  factory Factory @relation(fields: [factoryId], references: [id])

  @@unique([userId, factoryId])
}

model Shift {
  id           String      @id @default(uuid())
  factoryId    String
  type         ShiftType
  startTime    DateTime
  endTime      DateTime?
  supervisorId String
  status       ShiftStatus @default(ACTIVE)
  aiDigest     String?
  createdAt    DateTime    @default(now())

  factory    Factory      @relation(fields: [factoryId], references: [id])
  supervisor User         @relation(fields: [supervisorId], references: [id])
  production Production[]
  attendance Attendance[]
}

model ProductionLine {
  id        String @id @default(uuid())
  name      String
  factoryId String

  factory    Factory      @relation(fields: [factoryId], references: [id])
  production Production[]
}

model Production {
  id            String   @id @default(uuid())
  shiftId       String
  lineId        String
  supervisorId  String
  targetUnits   Int
  producedUnits Int
  rejectedUnits Int      @default(0)
  delayReason   String?
  notes         String?
  recordedAt    DateTime @default(now())

  shift      Shift          @relation(fields: [shiftId], references: [id])
  line       ProductionLine @relation(fields: [lineId], references: [id])
  supervisor User           @relation(fields: [supervisorId], references: [id])
  defects    Defect[]
}

model Defect {
  id           String   @id @default(uuid())
  productionId String
  count        Int
  reason       String
  description  String?
  recordedAt   DateTime @default(now())

  production Production @relation(fields: [productionId], references: [id])
}

model Machine {
  id              String        @id @default(uuid())
  factoryId       String
  name            String
  type            String
  status          MachineStatus @default(ACTIVE)
  installDate     DateTime?
  lastMaintenance DateTime?
  efficiencyPct   Float         @default(100)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  factory         Factory          @relation(fields: [factoryId], references: [id])
  maintenanceLogs MaintenanceLog[]
}

model MaintenanceLog {
  id               String          @id @default(uuid())
  machineId        String
  reportedBy       String
  faultDescription String
  downtimeStart    DateTime
  downtimeEnd      DateTime?
  resolvedBy       String?
  maintenanceType  MaintenanceType @default(CORRECTIVE)
  createdAt        DateTime        @default(now())

  machine  Machine @relation(fields: [machineId], references: [id])
  reporter User    @relation(fields: [reportedBy], references: [id])
}

model Attendance {
  id       String           @id @default(uuid())
  userId   String
  shiftId  String
  status   AttendanceStatus @default(PRESENT)
  checkIn  DateTime?
  checkOut DateTime?
  markedBy String?          // userId of Supervisor if set/overridden by roster; null if self check-in
  date     DateTime         @default(now())

  user  User  @relation(fields: [userId], references: [id])
  shift Shift @relation(fields: [shiftId], references: [id])

  @@unique([userId, shiftId])
}

model Notification {
  id        String        @id @default(uuid())
  factoryId String
  type      AlertType
  severity  AlertSeverity
  message   String
  isRead    Boolean       @default(false)
  createdAt DateTime      @default(now())

  factory Factory @relation(fields: [factoryId], references: [id])
}

model AlertConfig {
  id                     String  @id @default(uuid())
  factoryId              String  @unique
  productionThresholdPct Int     @default(80)
  rejectionThresholdPct  Int     @default(5)
  machineIdleMinutes     Int     @default(30)

  factory Factory @relation(fields: [factoryId], references: [id])
}

model Report {
  id          String   @id @default(uuid())
  factoryId   String
  type        String
  generatedBy String
  dateFrom    DateTime
  dateTo      DateTime
  fileUrl     String?
  createdAt   DateTime @default(now())
}
```

**Fix applied:** added `markedBy` (nullable) and a `@@unique([userId, shiftId])` constraint on `Attendance` — this resolves the ambiguity between "Operator checks in for own shift" and "Supervisor manages attendance": one row per user per shift, either self-created (checkIn via Operator, `markedBy = null`) or created/overridden by a Supervisor (`markedBy = supervisor's userId`). Without this constraint the two flows could silently create duplicate or conflicting rows for the same person.

---

## API Routes Reference

### Auth
```
POST   /api/v1/auth/login              # JWT with all factories + roles
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
```

### Factory Management
```
GET    /api/v1/factories               # Owner: all their factories
POST   /api/v1/factories               # Owner: register new factory
PUT    /api/v1/factories/:id           # Owner: update name/location
POST   /api/v1/factories/:id/invite    # Owner: invite member by email
PUT    /api/v1/factories/:id/members/:userId  # Owner: change role
DELETE /api/v1/factories/:id/members/:userId  # Owner: revoke access
GET    /api/v1/factories/:id/members   # Owner, Manager: list members
```

### All routes below require X-Factory-ID header
```
GET    /api/v1/production
POST   /api/v1/production/update       # Supervisor
POST   /api/v1/production/target       # Owner, Manager
GET    /api/v1/production/summary

GET    /api/v1/shifts
POST   /api/v1/shifts
PUT    /api/v1/shifts/:id/close        # Triggers Gemini digest

GET    /api/v1/machines
POST   /api/v1/machines                # Owner, Manager
PUT    /api/v1/machines/:id/status
POST   /api/v1/machines/:id/fault      # Operator
POST   /api/v1/machines/:id/resolve    # Owner, Manager
GET    /api/v1/machines/:id/logs

POST   /api/v1/attendance/checkin      # Operator: self check-in only (userId forced from JWT, not body)
PUT    /api/v1/attendance/:id/checkout # Operator: self check-out; Supervisor: any record on their shift
PUT    /api/v1/attendance/:id/mark     # Supervisor only: set PRESENT/ABSENT/LATE for any worker on the shift
GET    /api/v1/attendance/shift/:shiftId

GET    /api/v1/notifications
PUT    /api/v1/notifications/:id/read
PUT    /api/v1/notifications/read-all
GET    /api/v1/notifications/config
PUT    /api/v1/notifications/config

GET    /api/v1/reports/daily
GET    /api/v1/reports/weekly
GET    /api/v1/reports/monthly
GET    /api/v1/reports/shift/:id
POST   /api/v1/reports/export          # { format: 'pdf' | 'excel' }

POST   /api/v1/query/ask               # Owner, Manager — Text-to-SQL chat
```

**Fix applied:** split the old single `checkin`/`checkout` pair into a clearer permission split — Operators can only self check-in/out (their own `userId` is taken from the JWT, never from the request body, so an Operator cannot mark attendance for someone else), and a separate `mark` endpoint is Supervisor-only for setting status on any worker on their shift. This matches the PRD's role table ("Supervisor: manage attendance" vs "Operator: check in for shifts") instead of leaving both actions pointed at the same undifferentiated endpoint.

---

## Socket.IO Event Map

### Server → Client (scoped to factory:{factoryId} room)

| Event | Payload | Trigger |
|---|---|---|
| `production:updated` | `{ lineId, producedUnits, targetUnits, rejectedUnits, timestamp }` | Production record saved |
| `machine:fault` | `{ machineId, name, description, severity }` | Operator logs fault |
| `machine:resolved` | `{ machineId, downtimeMinutes }` | Fault marked resolved |
| `alert:fired` | `{ type, severity, message }` | Alert threshold breached |
| `shift:started` | `{ shiftId, type, supervisorName, startTime }` | Shift opened |
| `shift:ended` | `{ shiftId, summary, aiDigest }` | Shift closed + Gemini done |
| `attendance:updated` | `{ shiftId, presentCount, totalCount }` | Any check-in/out/mark |

### Client → Server

| Event | Payload | When |
|---|---|---|
| `join:factory` | `{ factoryId }` | On connect (after auth) |
| `ping` | `{}` | Keepalive every 30s |

---

## Alert Engine Logic

Runs after every production write and machine status change:

```
After production:update saved:
  efficiency = producedUnits / targetUnits × 100
  if efficiency < config.productionThresholdPct
    → create Notification (LOW_PRODUCTION, WARNING)
    → emit alert:fired

  rejectionRate = rejectedUnits / producedUnits × 100
  if rejectionRate > config.rejectionThresholdPct
    → create Notification (HIGH_REJECTION, WARNING)
  if rejectionRate > 10%
    → severity = CRITICAL

After machine:fault logged:
  → create Notification (MACHINE_FAULT, WARNING)
  → emit alert:fired

After machine idle > config.machineIdleMinutes:
  → create Notification (MACHINE_IDLE, WARNING)
  → emit alert:fired
```

---

## RBAC Matrix

| Action | Owner | Manager | Supervisor | Operator |
|---|:---:|:---:|:---:|:---:|
| Register / manage factories | ✓ | — | — | — |
| Invite / remove members | ✓ | — | — | — |
| Switch factory | ✓ | — | — | — |
| View live dashboard | ✓ | ✓ | ✓ | — |
| Assign production targets | ✓ | ✓ | — | — |
| Log production update | — | — | ✓ | — |
| Open / close shift | ✓ | ✓ | ✓ | — |
| Self check-in / check-out | — | — | — | ✓ |
| Mark attendance for others on shift | — | — | ✓ | — |
| View machines | ✓ | ✓ | ✓ | ✓ |
| Report machine fault | — | — | — | ✓ |
| Resolve machine fault | ✓ | ✓ | — | — |
| Configure alert thresholds | ✓ | ✓ | — | — |
| View notifications | ✓ | ✓ | ✓ | — |
| Generate / export reports | ✓ | ✓ | — | — |
| Use AI chat | ✓ | ✓ | — | — |

**Fix applied:** replaced the old single "Log attendance | — | — | ✓ | ✓" row (which didn't distinguish who does what) with two explicit rows — self check-in/out for Operator, and mark-attendance-for-others for Supervisor — matching the endpoint split above.

---

## Implementation Tasks

Grouped by module, in dependency order. No fixed timeline — work through each task, confirm it functions end-to-end, then move to the next. Each task lists backend work, frontend work, and a "Done when" check instead of a day/deadline.

### Task 1 — Project Setup & Infrastructure

**Backend:**
- Init Express.js project with the full folder structure above
- Install all dependencies (see Dependencies section)
- Configure Prisma + connect to Supabase/Neon PostgreSQL
- Write the full `schema.prisma`
- Run initial migration: `npx prisma migrate dev --name init`
- Write seed file: 1 factory owner, 1 factory, 1 manager, 1 supervisor, 1 operator, 3 machines, 2 production lines
- Set up `app.js` with middleware stack (Helmet, CORS, rate limit, Morgan, error handler)
- Set up `server.js` bootstrapping HTTP + Socket.IO
- Export Socket.IO instance from `config/socket.js`

**Frontend:**
- Init Vite + React + TypeScript: `npm create vite@latest frontend -- --template react-ts`
- Install all dependencies (see Dependencies section)
- Configure Tailwind CSS + ShadCN UI
- Configure Axios instance (`lib/api.ts`) with base URL + auth + X-Factory-ID interceptors
- Configure React Query client (`lib/queryClient.ts`)
- Set up Zustand auth store (`store/auth.store.ts`): `{ user, factories[], activeFactory, setActiveFactory }`
- Set up React Router in `main.tsx` with `BrowserRouter`
- Set up route structure in `App.tsx` with `ProtectedRoute` component

**Done when:** both apps boot, DB is migrated, seed data is in, routing shells work.

---

### Task 2 — Authentication + Multi-Tenant

**Backend:**
- `auth.service.js`: login (bcrypt compare → issue JWT with all factories[]), refresh, logout
- JWT payload: `{ sub, factories: [{ factoryId, role }] }`
- `auth.middleware.js`: verify Bearer token, attach `req.user`
- `rbac.middleware.js`:
  - Read `X-Factory-ID` header
  - Query `UserFactory` to confirm membership + resolve role
  - Attach `req.factoryId` and `req.role`
  - `requireRole(...roles)` guard factory function
- `factory.service.js`: create factory, invite member, update role, revoke access, list members
- `factory.routes.js`: all factory management endpoints

**Frontend:**
- Build `Login.tsx` page: email + password form, POST /auth/login, store tokens
- Axios interceptor: attach `Authorization: Bearer {token}` on every request
- Axios interceptor: attach `X-Factory-ID: {activeFactory.factoryId}` on every request
- Axios interceptor: catch 401 → call refresh → retry original request
- Build `ProtectedRoute.tsx`: redirect to /login if no token; redirect to /factories if no activeFactory
- Build `FactorySelect.tsx`: owner sees all factories with KPI summaries, clicks to select
- On factory select: `setActiveFactory()` in Zustand → `queryClient.invalidateQueries()` → navigate to /dashboard
- `FactorySwitcher.tsx`: dropdown in navbar for owners with 2+ factories

**Done when:** login works, JWT resolves correctly, owner can select a factory, all routes are protected.

---

### Task 3 — Factory Management UI

**Backend:**
- Full factory CRUD endpoints complete (from Task 2 service)
- Invite flow: look up user by email, create `UserFactory` row
- Member management endpoints (change role, revoke)

**Frontend:**
- Factory settings page: list members with roles, invite form, change role dropdown, remove button
- "Add new factory" flow: modal with name + location → POST /factories → auto-select new factory
- Factory overview cards on `FactorySelect.tsx` showing: name, location, active lines count, today's efficiency

**Done when:** owner can create factories, invite managers, manage members, and switch factories.

---

### Task 4 — Production Tracking + Alert Engine

**Backend:**
- `production.service.js`: `createUpdate()`, `assignTarget()`, `getShiftProduction()`, `getSummary()`
- Zod validation schemas for all production inputs
- After every `createUpdate()`: run alert engine checks, emit `production:updated` via Socket.IO
- `alert.engine.js`: check efficiency + rejection thresholds, create Notification, emit `alert:fired`

**Frontend:**
- Build `ProductionUpdateForm.tsx`: line selector, produced count, rejected count, delay reason dropdown — mobile-optimised, large touch targets
- Build `TargetAssignForm.tsx`: line selector, target units, shift selector (Manager/Owner only)
- Build production list view: all records for current shift in a table
- Wire form submission: POST → optimistic update → invalidate query

**Done when:** supervisor logs production → it's saved → the alert engine runs → a Socket.IO event fires.

---

### Task 5 — Live Dashboard

**Backend:**
- `GET /production/summary`: live KPIs for active shift (produced, target, efficiency, rejected)
- Socket.IO room architecture: client joins `factory:{factoryId}` on connect after JWT verify

**Frontend:**
- `hooks/useSocket.ts`: connect with `auth: { token }`, join `factory:{factoryId}` room, expose `on()` helper
- `hooks/useAlerts.ts`: subscribe to `alert:fired`, push to local list
- Build `Dashboard.tsx`:
  - `KPICard.tsx`: produced, target, efficiency %, rejected, active lines
  - `ProductionLineGrid.tsx`: one card per line, live numbers
  - `AlertFeed.tsx`: incoming alerts with severity colour badges
  - `FactoryChat.tsx`: chat input + message thread + suggested questions (wired fully in Task 9)
- React Query: fetch summary on mount, invalidate on `production:updated` Socket.IO event
- Live indicator: green pulsing dot that animates on each Socket.IO event

**Done when:** manager opens dashboard → KPIs load → supervisor submits a record → dashboard updates in under 1 second.

---

### Task 6 — Shifts + Gemini AI Digest

**Backend:**
- `shift.service.js`:
  - `openShift()`: create Shift, emit `shift:started`
  - `closeShift()`: calculate summary → call Gemini → store `aiDigest` → emit `shift:ended`
- `ai.service.js`: Gemini 1.5 Flash call with shift JSON → 3–4 sentence plain English summary
- Non-blocking: `try/catch` around the Gemini call — shift closes successfully even if AI fails

**Frontend:**
- Shift selector component in navbar: shows active shift type + supervisor name, open/close buttons
- `ShiftCard.tsx`: summary stats (produced, target, efficiency) + AI digest panel
- Listen for `shift:ended` → show summary modal with aiDigest
- Role-gate shift open/close controls

**Done when:** supervisor closes a shift → Gemini summary is generated → it appears on the manager dashboard within 1 second.

---

### Task 7 — Machines + Attendance

**Backend:**
- `machine.service.js`: `logFault()`, `resolveFault()`, `updateStatus()`, `getEfficiency()`
- On fault: update status → create MaintenanceLog → emit `machine:fault` → create Notification
- On resolve: calculate `downtimeMinutes` from `downtimeStart` to now → emit `machine:resolved`
- `attendance.service.js`:
  - `selfCheckIn()` / `selfCheckOut()` — Operator only, `userId` taken from JWT, upserts on the `[userId, shiftId]` unique key
  - `markAttendance()` — Supervisor only, sets PRESENT/ABSENT/LATE for any worker on their shift, sets `markedBy`
  - `getShiftAttendance()` — roster with status for the whole shift
- Emit `attendance:updated` after every check-in/out/mark

**Frontend:**
- Build `Machines.tsx`: grid of `MachineStatusCard.tsx` (status badge, type, efficiency %, last fault date)
- `FaultLogForm.tsx`: machine selector + fault description (Operator only)
- Resolve button on machine card (Manager/Owner only)
- Listen for `machine:fault` and `machine:resolved` → update card status live
- Dashboard machine widget: X active, Y idle, Z faults summary
- Build `Attendance.tsx` with two distinct views depending on role:
  - Supervisor sees `AttendanceRoster.tsx` — full worker list with status dropdown per person
  - Operator sees `SelfCheckInButton.tsx` — a single check-in/out control for themselves only
- Dashboard attendance widget: present/total count, updates live via `attendance:updated`

**Done when:** operator reports a fault → all dashboards turn red instantly; operator can check themselves in/out; supervisor can mark/override status for the whole shift roster without the two flows colliding.

---

### Task 8 — Notifications + Alert Configuration

**Backend:**
- `notification.service.js`: `getAll()`, `markRead()`, `markAllRead()`
- Ensure all alert engine triggers correctly create Notification records
- Alert config endpoints: get + update thresholds per factory

**Frontend:**
- Notification bell in navbar: unread count badge
- Slide-out notification panel: list with type icon, severity colour, timestamp
- Mark as read on click, mark all read button
- Alert config settings page (Manager/Owner): sliders for production threshold %, rejection threshold %, machine idle minutes
- Toast notifications for incoming `alert:fired` Socket.IO events

**Done when:** full notification system is live and threshold changes take effect on the next alert check.

---

### Task 9 — AI Chat (Text-to-SQL)

**Backend:**
- `query.service.js`:
  - Receive natural language question + factoryId
  - Build prompt: question + schema description + mandatory factoryId scoping
  - Gemini generates SQL
  - Validate SQL is read-only (no INSERT/UPDATE/DELETE/DROP)
  - Execute via Prisma `$queryRaw` with factoryId parameter
  - Gemini formats result rows as plain English
  - Return `{ answer, queryUsed }`

**Frontend:**
- `FactoryChat.tsx` fully wired: POST /query/ask → show "Thinking..." → render answer with source note
- Suggested question chips: "Why was production low last week?", "Which line had the most downtime?", etc.

**Done when:** AI chat answers real questions about factory data, and a malformed/write-attempt query is rejected server-side before execution.

---

### Task 10 — Reports

**Backend:**
- Install: `pdfkit`, `exceljs`
- `report.service.js`:
  - `getDailyReport()`: production, attendance, machine events for a date
  - `getWeeklyReport()`: 7-day aggregation
  - `getMonthlyReport()`: monthly totals
  - `getShiftReport()`: single shift full breakdown including aiDigest
  - `exportPDF()`: PDFKit — factory header, KPI table, line breakdown, machine events
  - `exportExcel()`: ExcelJS — same data in spreadsheet format
- All exports stream directly to client (no temp file storage needed)

**Frontend:**
- `Reports.tsx`: date/range picker, report type tabs (Daily / Weekly / Monthly / Shift)
- Report preview: summary stats + key charts (production trend, rejection rate)
- Download PDF button, Download Excel button
- Shift report accessible from `ShiftCard.tsx` with one click

**Done when:** manager selects a date range → previews the report → downloads PDF or Excel.

---

### Task 11 — Testing, Polish & Deployment

**Testing:**
- API integration tests (Supertest): auth, production, machines, attendance, reports, query/ask
- RBAC access tests: verify each role is blocked from routes they shouldn't access
- Attendance-specific tests: Operator cannot mark another user's attendance; Supervisor mark and Operator self-check-in never create duplicate rows for the same `[userId, shiftId]`
- Socket.IO test: verify events fire and reach the correct factory room only
- Factory isolation test: verify User A cannot access Factory B data via any route

**Polish:**
- Mobile UI audit: touch targets, form UX on small screens (supervisor factory-floor use case)
- Loading states on all async operations (React Query `isLoading`)
- Error states: friendly messages when API calls fail
- Empty states: "No production records yet", "No machines added", etc.
- Guard: prevent production submit when no active shift exists

**Deployment:**

Backend (Render):
```
1. Push to GitHub
2. Create Render Web Service → connect repo → set /backend as root
3. Build command: npm install
4. Start command: node server.js
5. Set env vars: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
                 GEMINI_API_KEY, CLIENT_URL, PORT, NODE_ENV
6. Add health check: GET /health → { status: 'ok' }
```

Frontend (Vercel):
```
1. Push to GitHub
2. Import project in Vercel → set /frontend as root
3. Build command: npm run build
4. Output directory: dist
5. Set env vars: VITE_API_URL, VITE_SOCKET_URL
```

Database (Supabase/Neon):
```
1. Create production PostgreSQL database
2. Run: npx prisma migrate deploy
3. Run: npx prisma db seed
4. Enable SSL on connection string
```

**Done when:** all 12 modules are live on Vercel + Render + Supabase.

---

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
GEMINI_API_KEY=...
CLIENT_URL=https://your-app.vercel.app
PORT=4000
NODE_ENV=production
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.onrender.com/api/v1
VITE_SOCKET_URL=https://your-backend.onrender.com
```

---

## Dependencies

### Backend
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.15.0",
    "@prisma/client": "^5.0.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "exceljs": "^4.4.0",
    "express": "^4.18.0",
    "express-rate-limit": "^7.0.0",
    "helmet": "^7.0.0",
    "jsonwebtoken": "^9.0.0",
    "morgan": "^1.10.0",
    "pdfkit": "^0.14.0",
    "socket.io": "^4.7.0",
    "winston": "^3.11.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "supertest": "^6.3.0"
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "recharts": "^2.10.0",
    "socket.io-client": "^4.7.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## Summary of Fixes vs v1.0

1. **Attendance ambiguity resolved** — v1.0's RBAC matrix listed "Log attendance" for both Supervisor and Operator with no distinction. Now split into two explicit actions (self check-in/out vs mark-for-others) with a dedicated `markAttendance()` service function, a separate `/attendance/:id/mark` route, and a `markedBy` field + `@@unique([userId, shiftId])` constraint on the schema to prevent duplicate/conflicting rows.
2. **Attendance UI split by role** — `Attendance.tsx` now explicitly renders `AttendanceRoster.tsx` for Supervisors and `SelfCheckInButton.tsx` for Operators, instead of one undifferentiated "worker list with check-in/out buttons."
3. **Timeline removed** — the old 10-day schedule and "End of day" deliverables are replaced with 11 tasks in dependency order, each with a "Done when" completion check instead of a date.
4. **Testing checklist expanded** — added explicit attendance-permission tests (Operator can't mark others; no duplicate rows) alongside the existing RBAC/factory-isolation tests.

---

*Smart Factory Operations Platform — Implementation Plan v2.0 (Task-Based)*
*React 18 + Vite · Node.js · PostgreSQL · Prisma · Socket.IO · Gemini AI*
