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

## Resume point — STEP: 7d Manager Accountability
- Build the Manager Accountability view (PD-008: participation/process, NOT quality):
  per manager, completion % and MEDIAN completion time (SUBMITTED -> MANAGER_COMPLETED).
  Query already exists: getManagerMedianCompletionTimes in reporting-queries.ts (verify it
  honours the timeframe scope; may need a scope arg like the others).
- Lights up the two landing cards still pointing at unbuilt routes:
  /reporting/completion ("How complete is the current process?") and
  /reporting/accountability ("How are managers participating and following through?").
  Decide whether these are one view or two (completion vs accountability).
- Honour the timeframe selector; neutral language; drillable where sensible.
- Add a harness (PD-014).

## Then: 7e exports + broader drill-down; 7f docs + v0.8 sign-off.

## Watch-outs
- Big files via clean `cat >` heredoc; python str.replace often fails on whitespace — prefer
  regex-tolerant or view exact lines first with `sed -n 'A,Bp' | cat -A`.
- `rm -rf .next` if typecheck errors reference deleted routes.
- Harnesses one-at-a-time after db:reset; reseed (+ demo seed) before viewing.
- If reports empty: wrong period is current -> re-run seed-reporting-demo.

## Orientation
cd /workspaces/HR/people-hub && git --no-pager log --oneline -5 && git status --short && cat docs/RESUME_NEXT.md
