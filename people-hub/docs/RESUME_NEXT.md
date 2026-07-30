# Resume Next — v0.8 Reporting & Insights

Last work: 7c comparison family COMPLETE (department, manager, criterion, gaps), all
time-scoped + drillable + neutral. Time-scoping retrofit done across ALL reports.
If restarted: `npm run typecheck`, `npm run db:reset`, then
`npx tsx scripts/seed-reporting-demo.ts` (creates "2026 Reporting Demo" period, sets it
CURRENT, Q1 + Q2 quarterly cycles + a values cycle, ~46 perf / ~24 values reviews).
NOTE: if reports look empty, a different (empty) period is current — re-run the demo seed.

## Done (committed, on GitHub)
- Time-scoping: reporting-scope.ts + ScopeSelector.tsx (first-class URL filter); every
  report (distribution, comparisons, landing, criterion, gaps) honours a per-report
  timeframe selector; default = latest meaningful cycle (PD-024); Full Year lists pooled
  cycles (PD-025); drill-down inherits scope.
- Distribution reports (performance, values): hero chart, KPI strip (avg/median/mode/
  %4-5/completed), drill-down.
- Comparison family: /reporting/departments, /managers (GroupComparisonView), /criterion
  (CriterionAnalysisView, Diagnostic layer PD-018/PD-026, reads item scores directly),
  /gaps (GapAnalysisView, self-vs-manager, neutral).
- Drill-down (/reporting/drilldown) handles: level buckets, group (dept/manager),
  criterion+level, gap buckets. Counts always match the source.
- Verified: stage7a 27/27, stage7c-criterion 12/12; regressions green.
- Decisions: PD-023/024/025 (time scoping), PD-026 (criterion reads item scores).
- Function comparison removed (== department at Tarabut). Backlog: cycle-creation governance.

## Resume point — STEP: 7e Exports
The reporting design calls for format-agnostic export (CSV in v0.8; Excel/PDF future). Each
report should export its underlying data, carrying "Last refreshed" (GST) and the applied
timeframe/filters into the export (PD-025: state timeframe + population). Decide: a shared
export helper (report -> rows -> CSV download) wired into each report's header, honouring the
current scope. HR-only. No new data — exports the same scoped data already shown.
After 7e: 7f = docs update (metric dictionary + design note "as-built") + v0.8 sign-off, then
v0.9 Moderation.

## Reporting suite — ALL BUILT (committed)
Landing (Exec Summary / Key Highlights / Explore Reports / reserved AI slot); distribution
(performance, values); comparison family (departments, managers, criterion [Diagnostic
PD-018/026], gaps); Manager Accountability (PD-008); Completion funnel. All time-scoped
(ScopeSelector, PD-023/024/025), drillable, neutral. Harnesses: 7a 27/27, criterion 12/12,
7d 8/8. Decisions through PD-026.


## Watch-outs
- Big files via clean `cat >` heredoc; python str.replace often fails on whitespace — prefer
  regex-tolerant or view exact lines first with `sed -n 'A,Bp' | cat -A`.
- `rm -rf .next` if typecheck errors reference deleted routes.
- Harnesses one-at-a-time after db:reset; reseed (+ demo seed) before viewing.
- If reports empty: wrong period is current -> re-run seed-reporting-demo.

## Orientation
cd /workspaces/HR/people-hub && git --no-pager log --oneline -5 && git status --short && cat docs/RESUME_NEXT.md
