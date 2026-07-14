# Tarabut People Hub — Stage 1

**Status:** Stage 1 (foundation) complete. Prototype. Fictional data only. Not a production system of record.

This is the foundation of the People Hub: project setup, database, authentication architecture, employee import, the core screens, role-based navigation, global search, notifications placeholder, and rating-guide-category support. The performance review workflow itself is built in later stages.

---

## 1. What Stage 1 includes

- Project setup (Next.js 15 + TypeScript + Prisma + PostgreSQL)
- Modular folder structure (core / modules / shared)
- Database schema (all Stage 1 tables, plus future-proofing for attachments and notifications)
- Microsoft Entra authentication **architecture** with a **mock provider only** (real Entra swaps in later without other code changes)
- Employee import module (Zoho CSV: upload, validate, preview, commit)
- Employee Directory, Employee Profile, My Team
- Role-based navigation (four roles, enforced server-side)
- Global search (HR / HR Admin)
- Notifications area (placeholder display only)
- Rating-guide-category support (configurable, separate from department)
- Seeded fictional data

Stage 1 does **not** include the review forms, scoring, cycles UI, guide-editing UI, reports, or any AI. Those are later stages.

---

## 2. Prerequisites (install these first)

You need three things on your machine:

1. **Node.js 18.18+ or 20+** — download from nodejs.org. Check with `node --version`.
2. **PostgreSQL 14+** — the database. Easiest options:
   - macOS: Postgres.app, or `brew install postgresql@16`
   - Windows: the EnterpriseDB installer
   - Any OS with Docker: `docker run --name people-hub-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`
3. A terminal (Terminal on Mac, PowerShell on Windows).

You do **not** need to be a developer to run this, but you do need to follow the steps in order.

---

## 3. How to run it locally (step by step)

**Step 1 — Open a terminal in the project folder.**
```
cd path/to/people-hub
```

**Step 2 — Install the code's dependencies.** (One-time; downloads libraries.)
```
npm install
```

**Step 3 — Create your settings file.** Copy the example and open `.env` in a text editor.
```
cp .env.example .env
```
In `.env`, set `DATABASE_URL` to match your PostgreSQL. If you used the Docker command above, the default value already works. If you installed Postgres yourself, adjust the username, password, and database name. The database named in the URL (`people_hub`) must exist — create it if needed:
```
createdb people_hub
```

**Step 4 — Build the database tables.** This reads the schema and creates every table.
```
npm run db:push
```

**Step 5 — Load the fictional data.**
```
npm run db:seed
```
You should see: `Seeded 10 employees, 6 rating guides, 1 cycle.`

**Step 6 — Start the app.**
```
npm run dev
```
Open the address it prints (usually http://localhost:3000). You'll land on the sign-in page.

**To stop:** press `Ctrl + C` in the terminal.
**To start fresh (wipe and re-seed):** `npm run db:reset` then `npm run db:seed`.

---

## 4. Folder structure explained

```
people-hub/
├── package.json            Project dependencies and commands (npm run ...)
├── tsconfig.json           TypeScript settings
├── next.config.mjs         Next.js settings
├── .env.example            Template for your settings (copy to .env)
├── docs/
│   └── sample_import.csv   A fictional CSV to test the import wizard
├── prisma/
│   ├── schema.prisma       THE DATABASE DESIGN (see section 5)
│   └── seed.ts             Loads fictional data
└── src/
    ├── core/               Shared foundations used by every module
    │   ├── auth/           Authentication (the "seam" + mock provider)
    │   │   ├── index.ts        The interface everything depends on
    │   │   └── mock-provider.ts Mock sign-in for the prototype
    │   ├── access/
    │   │   └── index.ts        Permission rules (who can see/do what)
    │   ├── audit/
    │   │   └── index.ts        Append-only audit logging
    │   ├── employees/
    │   │   └── import.ts       CSV parse, validate, preview, commit
    │   ├── notifications/
    │   │   └── index.ts        Notifications service seam (placeholder)
    │   └── search/
    │       └── index.ts        Global search (HR only)
    ├── modules/
    │   └── performance/        (Reserved for the review module — later stage)
    ├── shared/
    │   ├── components/
    │   │   └── GlobalSearch.tsx The search box in the top bar
    │   └── lib/
    │       └── prisma.ts       Database connection
    └── app/                    The screens (Next.js App Router)
        ├── layout.tsx          Wraps every page (prototype banner)
        ├── globals.css         Plain, functional styling
        ├── signin/page.tsx     Pick a fictional user to sign in as
        ├── api/search/route.ts Search endpoint (server-side, HR-checked)
        └── (app)/              Everything behind sign-in
            ├── layout.tsx      Top bar + role-based left navigation
            ├── page.tsx        Sends each role to their home screen
            ├── reviews/        My Reviews (employee landing)
            ├── team/           My Team (manager)
            ├── dashboard/      HR Dashboard (HR)
            ├── directory/      Employee Directory + Profile ([id])
            ├── notifications/  Notifications placeholder
            └── import/         Employee Import wizard (HR Admin)
```

The important idea: `core/` is built once. Every future module (Goals, L&D, Probation) becomes a folder under `modules/` that reuses auth, access, audit, and the rest without changing them.

---

## 5. Database schema explained

Defined in `prisma/schema.prisma`. Plain-language summary of each table:

- **Employee** — a copy of employee data imported from Zoho. Holds identity (email, name), reporting line (`managerId` points to another Employee), department, function/role, location, employment status, and **ratingGuideCategory**. The rating-guide category is a separate configurable field, deliberately **not** assumed equal to department.
- **RoleAssignment** — application roles (HR, HR Admin) granted to a person, separate from their job title. Everyone is at least an Employee; anyone with reports is treated as a Manager automatically.
- **AuditLog** — append-only record of consequential actions (who, what, when). Never edited.
- **Notification** — in-app notifications. The table exists now so email reminders can be added later with no schema change (channel field already present).
- **RatingGuide / RatingGuideVersion / RatingGuideAnchor** — the five performance guides plus the values guide, versioned so a historical review keeps the guidance that applied when it was written.
- **ReviewCycle / Review / ReviewRating** — the review data model. Defined now so the structure is stable; the review **screens** come in later stages. Employee and manager ratings are stored separately (`side` field) and never blended.
- **Attachment** — future-proofing. A generic (ownerType, ownerId) link so reviews and, later, development plans can carry attached documents **without changing existing tables**. No upload interface in Stage 1.

Why some tables have no UI yet: including them now keeps the schema stable, so later stages add screens without database migrations that touch existing data.

---

## 6. The authentication seam (important)

Authentication is architected as Microsoft Entra ID from day one, but Stage 1 ships a **mock provider** so the app can be built and tested before the live Entra tenant is connected.

Everything in the app depends only on `getCurrentUser()` and the `AuthUser` shape in `src/core/auth/index.ts`. When Entra is ready, a developer adds an `EntraAuthProvider` that implements the same interface and selects it via the `AUTH_MODE` setting. **No other code changes.** That is what prevents an authentication redesign later.

The mock provider (`mock-provider.ts`) sets a simple cookie naming the signed-in user. No passwords. The sign-in page lets you pick any fictional user so you can experience the app as an employee, a manager, HR, or an HR admin.

---

## 7. Testing checklist

Sign in as different fictional users (the sign-in page lists them with their role). Suggested runs:

**Sign in as an Employee** (e.g. Marco Rossi)
- [ ] Lands on **My Reviews**, showing own name, department, manager, rating guide.
- [ ] Left nav shows: My Reviews, Notifications. **No** My Team, Dashboard, Directory, Import.
- [ ] Cannot reach `/dashboard`, `/directory`, `/team`, `/import` by typing the URL — each redirects away. (This proves permissions are server-enforced, not just hidden.)
- [ ] Visiting another person's profile URL (`/directory/<someone-else-id>`) redirects away.

**Sign in as a Manager** (e.g. Amir Khan or Soo-jin Park)
- [ ] Left nav adds **My Team**. Still no Dashboard/Directory/Import.
- [ ] My Team lists **only** their direct reports.
- [ ] Can open a direct report's profile; **cannot** open a non-report's profile (redirects).

**Sign in as HR** (Dana Fischer)
- [ ] Lands on **HR Dashboard** with employee counts.
- [ ] Left nav shows Dashboard and Directory. **No** Import (that's HR Admin only).
- [ ] **Global search** box appears in the top bar. Type two+ letters of a name; results appear; clicking one opens that profile.
- [ ] Employee Directory: search, department filter, and status filter all work; "Clear" resets.

**Sign in as HR Admin** (Wafa Al-Sayed)
- [ ] Left nav also shows **Employee Import**.
- [ ] Notifications shows the two seeded placeholder items with a count badge in the nav.
- [ ] **Import wizard:** upload `docs/sample_import.csv`. Validate. You should see 4 new rows, and **1 error row** ("Ben Ghost" — manager `nobody@example.test` not found), and one row with a blank rating guide. Confirm import; the error row is skipped; the rest import. Check the Directory to see the new people.

**General**
- [ ] The "Prototype. Fictional data only." banner is on every screen.
- [ ] Sign out returns to the sign-in page.
- [ ] On a narrow window (or phone), the nav collapses and tables remain usable.

---

## 8. Known limitations of Stage 1 (by design)

- Screens are **functional, not styled** to the blueprint yet (agreed: styling is a later pass).
- No review forms, scoring, cycles UI, guide editing, reports, or AI.
- Auth is the mock provider; real Entra is a later step.
- Import is CSV; automated Zoho API sync is on the roadmap.

---

## 9. What I verified vs what you should verify

**Verified here:** the code type-checks cleanly (`npm run typecheck`), and the CSV parser/validator logic was unit-tested against the sample file (field mapping, blank guide, bad-manager detection, quoted commas).

**Could not run here:** the database and the app itself, because the build sandbox blocks Prisma's engine download. That is why you run steps 4–6 above on your machine. If step 4 (`db:push`) succeeds, the schema is valid against real PostgreSQL.
