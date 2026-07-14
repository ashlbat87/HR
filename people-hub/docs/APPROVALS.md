
## Stage 2 (quarterly review workflow) — Version 0.2

- **Status:** Approved as the prototype baseline, CONDITIONAL.
- **Approved by:** Ash (Head of People).
- **Date:** 14 July 2026.
- **Scope approved:** Quarterly review creation, employee workflow, manager
  workflow, draft saving, status tracking, quarterly score calculation, OKR
  contribution, development action, employee reflection, and the user-facing
  Audit Timeline. Excludes Annual Values, Year-End, reporting, dashboards.
- **Condition of approval:** Completion of the recommended manual UI spot-check
  of the Stage 1 screens (sign-in, directory, profile, team, import) to confirm
  no visual regression. OUTSTANDING at time of approval.
- **Verification:** All six Section 4 acceptance tests passed under automated
  execution against the real database (scripts/stage2-acceptance.ts). Core
  workflow also confirmed live during the build. See the Stage 2 Test Report and
  Acceptance Record.
- **Defects found and resolved during Stage 2:** vanishing Postgres (fixed via
  devcontainer), two pre-existing Stage 1 async params/searchParams type errors
  (directory fixed; profile fixed in the 0.2 tidy-up), and the client-side
  save-then-submit race (fixed with atomic server actions).
- **Carried-forward limitations (unchanged):** import commit not transaction-
  wrapped; prototype only, mock auth, not fit for real data.

---

## Stage 3 (Annual Values Review) — Planning Approved

- **Status:** Planning approved. Implementation authorised to begin, limited to the
  Annual Values Review only.
- **Approved by:** Ash (Head of People).
- **Date:** 14 July 2026.
- **Approved documents:** Product Roadmap v1.0; Stage 3 Technical Plan.
- **Architecture decision (accepted):** generalise the shared quarterly workflow and
  form to serve both review types, rather than duplicate. The Stage 2 acceptance
  harness is a mandatory regression gate before Stage 3 is accepted.
- **Acknowledgement (accepted default):** the employee acknowledges having seen the
  completed review (a read sign-off, not agreement).
- **Other accepted defaults:** per-value comments optional; one HR-created
  ANNUAL_VALUES cycle per year; anchors shown on the values form (quarterly-form
  anchors remain a separate future enhancement); reopen/close/return per the plan's
  permission matrix.
- **Scope authorised:** Annual Values Review only. No Stage 4 work.
- **Exit:** per the Stage 3 Technical Plan's release exit criteria; approval to be
  sought again on completion, with screenshots and a testing checklist.

---
