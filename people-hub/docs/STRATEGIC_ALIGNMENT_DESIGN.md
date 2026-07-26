# Strategic Alignment — Module Design Note (APPROVED, not yet scheduled)

(User-facing module name: "Strategic Alignment", deliberately methodology-agnostic so the
platform can support future planning frameworks without a rename. The underlying data model
uses OKR terms: Objectives, Key Results. "OKRs" below refers to the current methodology.)

Status: APPROVED — NOT YET SCHEDULED FOR DEVELOPMENT. A new major roadmap stage positioned
AFTER v0.9. Design approved; implementation begins only after v0.8 and v0.9 are complete.
Purpose: a central source of truth for organisational and departmental objectives, woven
into the performance review experience and available to employees and managers throughout
the quarter, so performance management is continuous rather than a retrospective exercise.

## 1. Purpose and outcomes
- One authoritative place for Company Objectives, Company Key Results, and Department OKRs
  per quarter.
- Surface the relevant Company and Department OKRs to employees when they answer "How did
  you contribute to the company OKRs?" during their review, so responses are evidence-based.
- Let employees and managers view current OKRs throughout the quarter (not only at review
  time), encouraging ongoing alignment between daily work and organisational priorities.
- Lay the foundation for future OKR reporting/analytics without building that now.

## 2. Scope (v1) and exclusions
IN (v1): quarterly Company Objectives; Company Key Results; Department Objectives linked to
a Company Objective; Department Key Results; quarter management (draft/active/archive); HR
administration; tiered read-only views; integration into the review "OKR contribution"
question.
OUT (v1, future): progress tracking / % complete; OKR scoring; reporting/analytics on OKR
progress; linking achievements or manager feedback to specific OKRs; cascading individual
goals. (Read-first before write-first — see product decisions.)

## 3. Information architecture
New top-level area "Strategic Alignment". Company level: per quarter, Company Objectives
each with Key Results. Department level: per quarter, Department Objectives each linked to a
parent Company Objective, each with their own Key Results. Quarter is the organising unit,
mapped to an existing review period/cycle (section 5a). Landing: current quarter's Company
Objectives + Key Results, and Department Objectives grouped by department. Archive view
lists previous quarters read-only (tiered by role).

## 4. Navigation
- New primary nav item "Strategic Alignment", visible to all signed-in users; what each
  role sees is tiered (employees: current quarter; managers: current + previous; HR: full
  archive + admin). Editing is HR-only.
- Within the review screen, the OKR contribution question gains an inline read-only
  "Current objectives" panel for that review's quarter.
- HR sees an additional "Manage" entry within the module.

## 5. Data model (proposed)
Additive; nothing existing changed destructively.
- OkrQuarter: id, label (e.g. "Q2 2026"), reviewPeriodId (FK), status (DRAFT | ACTIVE |
  ARCHIVED), createdAt.
- CompanyObjective: id, okrQuarterId (FK), title, description?, order, ownerId? (FK ->
  Employee: the Executive Owner / Sponsor), createdAt, updatedAt, updatedById? (basic
  audit).
- CompanyKeyResult: id, companyObjectiveId (FK), title, description?, order. (v1 text only;
  no measure/target/progress — future.)
- DepartmentObjective: id, okrQuarterId (FK), department (matches Employee.department),
  companyObjectiveId (FK, parent it aligns to), title, description?, order, ownerId? (FK ->
  Employee: Department Owner), createdAt, updatedAt, updatedById? (basic audit).
- DepartmentKeyResult (INCLUDED in v1): id, departmentObjectiveId (FK), title, description?,
  order. Gives department objectives the same objective+key-result structure.
Ownership: owners are Employee references (nullable) for governance and future reporting;
display gracefully when unset. Basic audit (createdAt/updatedAt/updatedById) records when
and by whom an objective last changed — lighter than full version history, sufficient for
v1. All read paths simple; all write paths HR-only.

## 5a. Quarter/period alignment (most important architectural choice)
An OkrQuarter ties to an existing ReviewPeriod, so "the OKRs for this review" resolves
deterministically: a Q2 2026 review surfaces the Q2 2026 OKRs. Avoids a parallel, drifting
time concept. Alternative (standalone OKR calendar) rejected: two sources of "what quarter
is it" risk mismatch at the integration point that matters. (Product decision.)

## 6. Quarter management
HR creates an OkrQuarter (linked to a review period), adds Company Objectives + Key Results,
and Department Objectives (aligned to company objectives) + their Key Results. Exactly one
quarter ACTIVE at a time; others DRAFT or ARCHIVED. Switchover is EXPLICIT: HR archives the
current active quarter, then activates the next (no auto-archive), to avoid accidental
switchover. Archiving freezes a quarter read-only and preserves it.

## 7. HR administration
HR-only create/edit/reorder of objectives, key results, and alignment links. Validation: a
Department Objective must link to a Company Objective in the same quarter; labels required.
Basic audit recorded (updatedBy). Guardrails: cannot edit an ARCHIVED quarter; deletion
restricted (prefer archive; allow delete only for an empty DRAFT quarter, mirroring the
delete-empty-cycle rule).

## 8. Employee experience
- Throughout the quarter: a "Strategic Alignment" view showing the CURRENT quarter's Company
  Objectives + Key Results and their own Department's OKRs. Read-only, current quarter only.
- During the review: the OKR contribution question shows the relevant Company + Department
  OKRs inline (read-only), scoped to the review's quarter and the employee's department.

## 9. Manager experience
- Throughout-the-quarter view with access to the current AND previous quarter (read-only):
  company-wide objectives and their own department's OKRs.
- During review of a report: the same read-only OKR panel alongside the employee's
  contribution answer, for context. No manager editing (HR-only).

## 10. Integration with the Performance Review workflow
- Non-destructive: the existing Review.okrContribution field is unchanged; the module adds a
  read-only contextual panel next to that question, sourced from the OkrQuarter tied to the
  review's period/cycle.
- Resolution: review -> its cycle/period -> matching OkrQuarter -> Company Objectives + the
  employee's Department OKRs -> render read-only. No OKRs for that quarter -> neutral empty
  state; the question still works as today.
- Separation of concerns (Product Decision): OKRs provide CONTEXT only; never scored, never
  blended into ratings, never altering the review workflow or its states.

## 11. Future roadmap opportunities (not v1)
- Progress tracking on key results (measures, targets, % complete) and OKR scoring.
- Reporting/analytics: organisational progress against OKRs; departmental contribution;
  effort distribution.
- Linking achievements and manager feedback to specific OKRs.
- Cascading/aligning individual goals to department/company OKRs.
- Continuous achievement capture: employees capture achievements through the quarter and
  reference them at review time, so the review becomes assembly of running evidence rather
  than end-of-quarter recall. Future only; natural companion to referencing OKRs throughout
  the quarter.
- Foundation for strategic-alignment analytics, distinct from the Reporting & Insights three
  layers (Outcome / Diagnostic / Behaviour). Strategic Alignment is a fourth concern —
  "what we are trying to achieve".

## 12. Permissions summary (tiered visibility)
- Employees: CURRENT quarter only. Read-only.
- Managers: current AND previous quarter. Read-only.
- HR/HR Admin: full archive + administration, server-guarded, changes recorded.
- In-review OKR panel: read-only for everyone; shows the review's own quarter regardless of
  the general archive tiers.

## 13. Acceptance criteria (for the eventual build)
1. HR can create a quarter (linked to a review period), add company objectives + key
   results, and department objectives (aligned) + key results.
2. Exactly one quarter ACTIVE; explicit archive-then-activate; archived quarters read-only.
3. Tiered views: employees current; managers current+previous; HR full archive.
4. A review surfaces the correct quarter's Company + employee's Department OKRs inline,
   read-only, next to the contribution question; neutral empty state when none.
5. OKRs never alter ratings or review states (context only); performance/values unaffected.
6. All edits HR-only, with basic audit (updatedBy); tiered view access enforced.
7. Regressions: existing review workflow harnesses still pass; typecheck clean.

## 14. Settled decisions
- Module name "Strategic Alignment" (methodology-agnostic; OKR data model beneath).
- Positioned after v0.9.
- Tiered visibility (employee current / manager current+previous / HR full).
- Ownership (Executive Owner, Department Owner) as Employee relationships, nullable.
- Basic audit (created / updated / updatedBy).
- Department-level Key Results INCLUDED in v1.
- ACTIVE switchover: EXPLICIT archive-then-activate.
- Exactly ONE set of company objectives per quarter.
- OKRs are context-only (Product Decision).
- Read-first before write-first (Product Decision): v1 is a single source of truth to
  improve alignment; NOT an OKR management system, progress-tracking tool, or goal-setting
  module. Progress tracking and individual objective management are separate future product
  decisions, not incremental additions here.
- Continuous achievement capture is a future enhancement (not v1).
