# FactoryOS — Smart Factory Operations Platform

Production-grade, dark industrial-themed frontend for **FactoryOS**, a real-time Smart Factory Operations and SCADA Control Room platform.

Built with **React 18/19**, **TypeScript**, **Vite**, **Tailwind CSS**, **Zustand**, **React Router DOM**, **TanStack Query v5**, **Axios**, and **Lucide React**.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build & Linting
```bash
npm run build   # tsc -b && vite build
npm run lint    # oxlint
```

---

## Authentication & Credentials
- The login interface accepts **any credentials**.
- A display name is automatically derived from the entered email address.
- A **Quick-Select Test Persona** widget on `/login` allows instant 1-click verification of different user roles:
  - **OWNER**: Full administrative and operational permissions.
  - **SUPERVISOR**: Can execute shift roster attendance overrides.
  - **OPERATOR**: Can dispatch machine fault logs and submit production shift runs.
  - **VIEWER**: Read-only telemetry mode; all write triggers (fault reporting, resolving faults, roster overrides, logging runs) are visibly disabled.

---

## Architecture & Data Flow

- **In-Memory SCADA Mock Service (`src/lib/mockService.ts`)**:
  - All real-time telemetry, lines, assets, and rosters are powered by an in-memory mock service seeded across 4 facilities:
    1. **Berlin Gigafactory** (`f-1`)
    2. **Detroit Stamping Facility** (`f-2`)
    3. **Portland Assembly Plant** (`f-3`)
    4. **Austin Tech Hub** (`f-4`)
  - Simulates realistic network latency (300ms–900ms) for all queries and mutations.
  - Mutations (fault reporting, fault resolution, attendance overrides, production run logging) actually mutate in-memory state and immediately reflect across live counters and tables.
- **TanStack Query v5 Hooks (`src/hooks/useFactoryData.ts`)**:
  - Automatically polls line throughput, machines, and KPIs every 9 seconds to simulate live SCADA data streams.
  - Mutations automatically invalidate relevant cache queries and push reactive toasts.
- **Zustand UI & Auth Stores**:
  - `useAuthStore`: Session tokens and active factory persisted to `localStorage`.
  - `useUiStore`: Collapsible sidebar state, mobile off-canvas drawer, and live toast notification queue.
- **Industrial Design System**:
  - Dark control room palette (`slate-950` base, `slate-900` cards, `slate-800` borders).
  - Typography: **Rajdhani** (Display / Headings), **IBM Plex Mono** (Tabular readouts & telemetry), **Inter** (Body).
  - Hazard-stripe accent bars and control-room glow shadows (`shadow-glow`, `shadow-glow-red`, `shadow-glow-emerald`).

---

## Deliverable Archive
The complete repository (excluding `node_modules` and `dist`) is packaged in `FactoryOS-frontend.zip` at the root of the project.
