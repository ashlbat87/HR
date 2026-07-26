// Reporting time-scoping (v0.8). Resolves which cycles exist for a dimension, the latest
// MEANINGFUL cycle (PD-024, configurable threshold), and turns URL params into the scope the
// query layer consumes. Reporting is limited to QUARTERLY (performance) and ANNUAL_VALUES
// (values); YEAR_END excluded (PD-023).

import { prisma } from "@/shared/lib/prisma";
import type { RatingDimension } from "./reporting-queries";

// Configurable: minimum completed reviews for a cycle to count as "meaningful" as a default
// (PD-024). Not hard-coded in views; change here. A newly opened cycle below this stays
// non-default until it crosses the threshold, so reports don't default to a near-empty
// quarter.
export const MEANINGFUL_CYCLE_MIN_COMPLETED = 3;

const TYPE_FOR_DIMENSION: Record<RatingDimension, "QUARTERLY" | "ANNUAL_VALUES"> = {
  PERFORMANCE: "QUARTERLY",
  VALUES: "ANNUAL_VALUES",
};

export interface CycleOption {
  id: string;
  label: string;
  isOpen: boolean;
  completedCount: number;
  meaningful: boolean;
}

// All cycles of the dimension in a period, newest first, with completed-review counts.
export async function getCyclesForDimension(periodId: string, dimension: RatingDimension): Promise<CycleOption[]> {
  const type = TYPE_FOR_DIMENSION[dimension];
  const cycles = await prisma.reviewCycle.findMany({
    where: { periodId, type },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, isOpen: true, reviews: { where: { status: "COMPLETE" }, select: { id: true } } },
  });
  return cycles.map((c) => {
    const completedCount = c.reviews.length;
    return { id: c.id, label: c.label, isOpen: c.isOpen, completedCount, meaningful: completedCount >= MEANINGFUL_CYCLE_MIN_COMPLETED };
  });
}

// The latest MEANINGFUL cycle (PD-024): the newest cycle that meets the threshold; if none
// meet it, fall back to the newest cycle that has ANY completed reviews; else the newest.
export async function resolveDefaultCycleId(periodId: string, dimension: RatingDimension): Promise<string | null> {
  const cycles = await getCyclesForDimension(periodId, dimension);
  if (cycles.length === 0) return null;
  const meaningful = cycles.find((c) => c.meaningful);
  if (meaningful) return meaningful.id;
  const anyCompleted = cycles.find((c) => c.completedCount > 0);
  if (anyCompleted) return anyCompleted.id;
  return cycles[0].id;
}

// The resolved reporting scope: either a single cycle, or the full period (pooled).
export type ReportScope =
  | { kind: "cycle"; cycleId: string; periodId: string; cycleLabel: string; periodLabel: string }
  | { kind: "year"; periodId: string; periodLabel: string };

// Resolve URL params into a ReportScope. Params: ?cycle=<id> for a single cycle;
// ?scope=year (with the current period) for full year; nothing -> default cycle.
export async function resolveScope(dimension: RatingDimension, params: { cycle?: string; scope?: string; period?: string }): Promise<ReportScope | null> {
  // Determine the working period: explicit ?period, else the current period.
  const period = params.period
    ? await prisma.reviewPeriod.findUnique({ where: { id: params.period }, select: { id: true, label: true } })
    : await prisma.reviewPeriod.findFirst({ where: { isCurrent: true }, select: { id: true, label: true } });
  if (!period) return null;

  if (params.scope === "year") {
    return { kind: "year", periodId: period.id, periodLabel: period.label };
  }

  // A specific cycle, if valid and of this dimension.
  const type = TYPE_FOR_DIMENSION[dimension];
  if (params.cycle) {
    const c = await prisma.reviewCycle.findFirst({ where: { id: params.cycle, periodId: period.id, type }, select: { id: true, label: true } });
    if (c) return { kind: "cycle", cycleId: c.id, periodId: period.id, cycleLabel: c.label, periodLabel: period.label };
  }

  // Default: latest meaningful cycle.
  const defId = await resolveDefaultCycleId(period.id, dimension);
  if (!defId) return { kind: "year", periodId: period.id, periodLabel: period.label }; // no cycles -> period (empty state)
  const c = await prisma.reviewCycle.findUnique({ where: { id: defId }, select: { id: true, label: true } });
  return { kind: "cycle", cycleId: c!.id, periodId: period.id, cycleLabel: c!.label, periodLabel: period.label };
}

// Turn a ReportScope into the { cycleId } | { periodId } shape the query layer accepts.
export function scopeToQuery(scope: ReportScope): { cycleId: string } | { periodId: string } {
  return scope.kind === "cycle" ? { cycleId: scope.cycleId } : { periodId: scope.periodId };
}

// Whether "Full year" should be offered for this dimension (values: only when >1 cycle).
export async function fullYearAvailable(periodId: string, dimension: RatingDimension): Promise<boolean> {
  const cycles = await getCyclesForDimension(periodId, dimension);
  if (dimension === "VALUES") return cycles.length > 1;
  return cycles.length >= 1;
}
