# Resume Next — v0.8 Reporting & Insights (design pass)

Last work: design system established + landing rebuilt as the reference implementation
(PD-027, commit 4485e52). If restarted: `npm run typecheck`, `npm run db:reset`, then
`npx tsx scripts/seed-reporting-demo.ts` (demo period "2026 Reporting Demo" current, Q1+Q2
quarterly + values cycle). If reports look empty, wrong period is current — re-run demo seed.
After editing lots of styles/routes: `rm -rf .next` before viewing.

## Done (committed)
- Full reporting suite BUILT + time-scoped + drillable (distribution, comparison family
  [dept/manager/criterion/gaps], accountability, completion) — stages 7a-7d.
- 7e CSV export: one HR-guarded /reporting/export route, self-describing CSV, Export CSV in
  every report header (PD-025).
- 7f DESIGN SYSTEM: globals.css extended additively (no existing tokens/classes changed) with
  --shadow-lift, spacing scale, and pattern classes (.rpt-masthead, .timeframe-box,
  .section-label, .exec-summary, .kpi-strip/.kpi-card, .attention, .rpt-group/.rpt-card).
  docs/REPORTING_DESIGN_SYSTEM.md is the standard. PD-027.
- LANDING rebuilt as reference: masthead + primary timeframe control, single calm exec
  summary, five-KPI strip w/ population subtitles, neutral threshold-driven Needs Attention,
  grouped cards (Performance/Process/Values), primaries first. Data wiring unchanged.

## Resume point — STEP: retrofit the report PAGES to the design language
The landing is the reference; report pages still use the older inline-styled header
(plain h1 + ScopeSelector + timeframe chip). Retrofit each to the design language
(masthead/section-label/timeframe-box, consistent card + KPI styling), PRESENTATION ONLY —
no query/data changes, harnesses stay green. One at a time, commit each. Suggested order:
1. DistributionView (most used; sets the pattern; has KPI strip already)
2. GroupComparisonView (departments + managers)
3. CriterionAnalysisView
4. GapAnalysisView
5. ManagerAccountabilityView
6. CompletionView
Each report "adopts the language while optimising for its content" — feel like one product,
not identical (PD-027).

## Then: FINAL UX consistency review
Apply the logged improvements together (see docs/REPORTING_DESIGN_SYSTEM.md "Improvements
backlog"): (a) ScopeSelector label leaks "(open)" status — clean display label; (b) exec
summary "What HR should do" reads evaluatively ("may warrant review") — soften
buildExecutiveSummary phrasing to observational (PD-010); (c) optionally restyle ScopeSelector
to visually match the timeframe-box. Then v0.8 SIGN-OFF, then v0.9 Moderation.

## Watch-outs
- Presentation-only retrofits: never touch queries; run a harness after each if unsure.
- Big paste = clean `cat >` heredoc ending exactly at ENDOFFILE; python edits often miss on
  whitespace (view with `sed -n 'A,Bp' | cat -A` first, or use regex-tolerant).
- `rm -rf .next` after style/route changes before viewing.
- Do NOT upgrade Prisma (stay 5.22.0) despite the CLI banner.

## Orientation
cd /workspaces/HR/people-hub && git --no-pager log --oneline -5 && git status --short && cat docs/RESUME_NEXT.md
