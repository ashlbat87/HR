# Resume Next — Reporting & Insights time-scoping retrofit (continued)

Last work: distribution reports are fully time-scoped (steps 1-3 done). Remaining: apply the
same scoping to the comparison views + landing (step 4), then build criterion + gaps (step 5).
If restarted: `npm run typecheck`, `npm run db:reset`, then
`npx tsx scripts/seed-reporting-demo.ts` (demo now has Q1 + Q2 quarterly cycles + a values
cycle, so the timeframe selector has multiple options to switch between).

## Done (committed)
- Time-scoping foundation: reporting-scope.ts (resolveScope, scopeToQuery,
  getCyclesForDimension, resolveDefaultCycleId=latest meaningful, fullYearAvailable,
  MEANINGFUL_CYCLE_MIN_COMPLETED=3) + ScopeSelector.tsx (first-class URL filter).
- DistributionView + performance/values pages + drilldown: all honour the selected
  cycle/full-year; drill-down counts match the bar under any timeframe; Full Year lists the
  pooled cycles explicitly (PD-025).
- Demo seed: added a Q1 cycle (lower spread) so switching Q1/Q2/Full year visibly changes
  the data.
- Governing decisions: PD-023 (cycle default, opt-in full year, per-report URL filter,
  QUARTERLY+ANNUAL_VALUES only), PD-024 (latest meaningful cycle, configurable threshold),
  PD-025 (pooling never silent). Backlog: cycle-creation governance.

## Resume point — STEP 4: scope the comparison views + landing
Mirror the DistributionView retrofit in:
1. GroupComparisonView.tsx (backs departments + managers): add `params` prop; resolveScope
   -> scopeToQuery for getReviewData; load getCyclesForDimension + fullYearAvailable; render
   <ScopeSelector>; timeframe chip (with pooled-cycles list on full year); drillBase carries
   `&cycle=<id>` or `&period=<id>&scope=year`.
2. departments/page.tsx + managers/page.tsx: accept `searchParams`, pass `params` through
   (like the distribution pages).
3. Landing reporting/page.tsx: decide scope (LEAN: default to latest meaningful cycle with
   the same selector, consistent with reports) and wire it.
Pattern reference: DistributionView.tsx (already done) is the template.

## STEP 5: finish the comparison family (after step 4)
- Performance-criterion analysis (first Diagnostic-layer report, PD-018): new query over
  item-level MANAGER-side ReviewRating (Impact/Quality/Delivery): per criterion avg,
  distribution, %at4-5, completed-count; each drillable; reads item scores directly (NOT the
  official-rating resolver) so unaffected by v0.9 moderation -> record a PD when built; add a
  harness (PD-014). Honour time scope.
- Self-vs-manager gaps report: computeGap; avg gap + gap-size distribution; drill-down.
- All: neutral language, "based on N", performance/values separate, honour time scope.

## Watch-outs
- ScopeSelector uses useSearchParams() -> wrap in <Suspense> if the build complains (hasn't
  so far).
- Big files via clean `cat >` heredoc ending exactly at ENDOFFILE.
- `rm -rf .next` if typecheck errors reference deleted routes.
- Harnesses one-at-a-time each after db:reset; reseed before viewing.

## Orientation
cd /workspaces/HR/people-hub && git --no-pager log --oneline -5 && git status --short && cat docs/RESUME_NEXT.md
