# Resume Next — v0.10 Production Hardening (the production gate)

v0.9 Historical Data Migration is COMPLETE and ACCEPTED (signed off 07 Aug 2026, see
docs/APPROVALS.md). The migration TOOL is built + proven on synthetic data (stage8 22/22).
Next milestone: v0.10 Production Hardening — the gate that allows real data.
Setup if restarted: `npm run typecheck`, `npm run db:reset`. Do NOT upgrade Prisma.

## Where the project stands
Full performance platform complete + signed off through v0.9: reviews (quarterly, values,
year-end), cycles/periods, HR dashboard, reporting & insights, and a proven historical-data
migration tool. Everything to date is PROTOTYPE (synthetic/fictional data, mock auth). No real
employee data has entered the system.

## v0.10 = the production gate (two tracks)
TRACK A — buildable (with Claude): replace mock auth with real auth (Microsoft 365 / Entra;
Employee.workEmail already keys to this); production config + environment hardening; data-
handling review before real data.
TRACK B — organisational (Ash + IT/Legal/InfoSec, in parallel; NOT buildable by Claude):
approved hosting + data residency (KSA/UAE/Bahrain, PDPL/SAMA/CBUAE/CBB); signed DPIA; named
owner(s) + InfoSec approval. Each a separate ticked item.

## Data prep Ash can start NOW (independent; needed for the real migration run)
- Roster loaded WITH work emails (Hub matches by workEmail).
- Name->email reconciliation for the workbooks (they have NAME only; Hub matches displayName).
  The most friction-prone part of the real run — clean it now.
- Decide which historic year(s); gather filled workbooks (one per employee) per year.

## When real import can happen
Track A built + Track B signed off + roster/mapping ready -> a named operator runs
`npx tsx scripts/migrate-history.ts <folder> <year>` in the approved environment. See
docs/MIGRATION_RUNBOOK.md.

## Suggested next session
Start v0.10 with a design note (approval-gated) scoping Track A (real auth + production config).

## Orientation
cd /workspaces/HR/people-hub && git --no-pager log --oneline -6 && git status --short && cat docs/RESUME_NEXT.md
