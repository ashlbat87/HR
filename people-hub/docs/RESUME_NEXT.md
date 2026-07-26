# Resume Next — Reporting & Insights time-scoping retrofit

Last commit: fc96d61 (clean tree, build green). If restarted: `npm run typecheck`,
`npm run db:reset`, then `npx tsx scripts/seed-reporting-demo.ts` for populated reports
(demo period sets itself current; `--clear` restores).

## Where we are
- Committed & safe: comparison family (department + manager, function removed), and the
  time-scoping FOUNDATION: src/modules/performance/reporting-scope.ts (resolveScope,
  scopeToQuery, getCyclesForDimension, resolveDefaultCycleId, fullYearAvailable,
  MEANINGFUL_CYCLE_MIN_COMPLETED=3) and src/app/(app)/reporting/ScopeSelector.tsx
  (first-class timeframe filter, writes ?cycle=<id> or ?scope=year to URL).
- Built but NOT wired in yet: nothing consumes reporting-scope.ts / ScopeSelector yet.
- Governing decisions: PD-023 (default to a cycle, opt-in full year, per-report URL filter,
  reporting = QUARTERLY+ANNUAL_VALUES only, YEAR_END excluded), PD-024 (default = latest
  MEANINGFUL cycle, configurable threshold), PD-025 (pooling is never silent). Design note:
  docs/REPORTING_TIME_SCOPING_DESIGN.md.

## Resume point: wire the selector into the reports
1. DistributionView.tsx: add `params: { cycle?; scope?; period? }` prop; call
   `resolveScope(dimension, params)` -> if null, empty state; else `scopeToQuery(scope)` for
   getReviewData. Load `getCyclesForDimension(scope.periodId, dimension)` and
   `fullYearAvailable(...)`. Render <ScopeSelector> in the header. Show timeframe statement:
   cycle -> "Showing: {cycleLabel}"; year -> "Showing: Full year {periodLabel} — pooled
   across all {dim} cycles" (PD-025). drillBase carries `&cycle=<id>` or
   `&period=<id>&scope=year` instead of just period.
2. performance/page.tsx and values/page.tsx: accept `searchParams` (Promise) and pass the
   awaited params into <DistributionView params=... />.
3. drilldown/page.tsx: honour cycle-vs-year (use scope from cycle/scope params via
   resolveScope + scopeToQuery) so counts match the source exactly.
4. GroupComparisonView.tsx + departments/managers pages + landing (reporting/page.tsx):
   same wiring (params -> resolveScope -> scopeToQuery -> selector + timeframe statement).
5. THEN finish the comparison family:
   - Performance-criterion analysis: first Diagnostic-layer report (PD-018). New query over
     item-level MANAGER-side ReviewRating (Impact/Quality/Delivery): per criterion avg,
     distribution, %at4-5, completed-count; each drillable. Reads item scores directly (NOT
     the official-rating resolver) so unaffected by v0.9 moderation — record as a PD when
     built. Add its own harness (PD-014).
   - Self-vs-manager gaps report: use computeGap; avg gap + gap-size distribution; drill-down.
   All: neutral language, "based on N", performance/values separate, honour time scope.

## Watch-outs
- ScopeSelector uses useSearchParams() -> may need a <Suspense> boundary in the page; wrap
  if the build complains.
- Big files via clean `cat >` heredoc ending exactly at ENDOFFILE (no stray token after).
- Clear stale route types with `rm -rf .next` if typecheck errors reference deleted routes.
- Harnesses run one-at-a-time each after its own db:reset; reseed before browser viewing.
- After editing, `npm run typecheck`; commit + push often.

## Orientation
cd /workspaces/HR/people-hub && git --no-pager log --oneline -5 && git status --short
