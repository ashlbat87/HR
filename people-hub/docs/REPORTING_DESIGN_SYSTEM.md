# Reporting & Insights — Design System

Status: APPROVED (v0.8, Stage 7f). The approved landing page is the reference
implementation. Individual report pages adopt this language while optimising for their own
content — they should feel like one product, not look identical.

## Governing principle
Calm, premium, executive. If a change adds visual weight without adding meaning, don't make
it. Benchmark: would this sit naturally beside Workday People Analytics, Culture Amp, or
Power BI.

## Tokens (all in globals.css; built on the existing v1.1 palette — do NOT duplicate colours)
- Colour/neutral: use the existing --purple / --purple-dark / --purple-subtle and the --n0..--n90
  ramp via the semantic aliases --surface, --border, --muted, --text, --bg. Never introduce
  parallel colour names.
- Added by the design system: --shadow-lift (card hover), spacing scale --space-1..--space-7.
- Accent discipline: purple is an ACCENT on a neutral canvas (section bars, KPI top-rule, card
  hover, selected-timeframe dot, emphasised metrics). Never fill large areas with colour.

## Pattern classes (globals.css)
- .rpt-masthead — page title + purpose + primary timeframe control (top-right).
- .timeframe-box — first-class boxed timeframe control with a population subtitle
  ("Showing / <cycle> / <N> completed reviews").
- .section-label — small uppercase muted section heading with a purple bar. NOT an h2.
- .exec-summary — ONE calm card, three labelled rows (What happened / What HR should know /
  What HR should do), subtle separators, key numbers weighted via .metric. Emphasis on the
  insight, not the container.
- .kpi-strip / .kpi-card — five metrics (Average, Median, Most Common, % Rated 4-5, Completed),
  purple top-rule, big figure, small label, small population subtitle ("Based on N reviews").
- .attention — "Needs Attention": NEUTRAL observations only (never verdicts/recommendations),
  each a threshold-driven fact linking to its report. See rules below.
- .rpt-group / .rpt-card — reports grouped (Performance / Process / Values). Cards are calm and
  UNIFORM (no size-based emphasis); muted icons that colour on hover; title + description are
  the hero; a small .cmeta confidence indicator; "Explore ->" affordance; hover lift.

## Rules (decisions baked into the standard)
1. Calm uniform grid: report cards are equal weight. Guide usage by ORDER (primary reports
   first within a group) and grouping, NOT by size or colour. (Rejected: variable card sizes.)
2. Needs Attention is observational and neutral. "2 departments differ from the organisational
   average" — never "requires review" / "needs action". Threshold-driven (same rules behind the
   summary). Preserves PD-008 (participation not quality) and PD-010 (rule-based, bounded).
3. Confidence indicators (.cmeta) state SCALE, never outcome ("6 departments analysed", "46
   reviews"). "Updated today" only where genuinely true at load.
4. Icons support recognition; they never dominate. Title + description lead.
5. No placeholder for future features in the live UI (AI slot is a decision, not shown).
6. Every report honours the timeframe selector; population is always stated.

## Working discipline (set by Ash)
The landing is the design system. Improvements found while building/retrofitting later report
pages are NOT applied ad hoc — they are RECORDED in the "Improvements backlog" below and applied
consistently across the module at the FINAL UX CONSISTENCY REVIEW.

## Improvements backlog (apply at final consistency review)
- ScopeSelector renders the raw cycle label including status suffixes (e.g. "Q2 2026 (demo)
  (open)"). The "(open)" state leaks into an executive-facing control. Clean the selector's
  display label (show label only; convey open/closed elsewhere if needed).
- Executive summary "What HR should do" can read evaluatively (e.g. "Department comparison may
  warrant further review"), which conflicts with the neutral-observation principle (brief pt 4
  / PD-010). Soften buildExecutiveSummary recommendation phrasing to observational wording.
- Consider restyling ScopeSelector to visually match the timeframe-box treatment (currently a
  native select inside the box; works, but not pixel-matched to the mock).
