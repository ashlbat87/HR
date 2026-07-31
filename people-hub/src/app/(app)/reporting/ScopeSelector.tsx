"use client";

// First-class timeframe filter (v0.8, PD-023; Stage 7f polish). Shows the current selection
// and makes alternative timeframes switchable. Writes the choice to the URL (?cycle=<id> or
// ?scope=year) so it carries across reports and into drill-down. Clean label only (cycle
// open/closed status is NOT shown here — it's not a status control). Keeps a "limited data"
// note where a cycle is below the meaningful threshold (a data-confidence signal, PD-024).

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export interface CycleChoice { id: string; label: string; isOpen: boolean; meaningful: boolean; }

export function ScopeSelector({
  cycles, fullYearAvailable, currentKind, currentCycleId, periodLabel,
}: {
  cycles: CycleChoice[];
  fullYearAvailable: boolean;
  currentKind: "cycle" | "year";
  currentCycleId?: string;
  periodLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setParam = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    router.push(`${pathname}?${sp.toString()}`);
  };
  const value = currentKind === "year" ? "year" : (currentCycleId ?? "");
  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === "year") setParam({ scope: "year", cycle: null });
    else setParam({ cycle: v, scope: null });
  };
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          width: "100%", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em",
          padding: "6px 30px 6px 0", border: "none", borderBottom: "2px solid var(--purple)",
          background: "transparent", color: "var(--text)", cursor: "pointer",
          appearance: "none", WebkitAppearance: "none", MozAppearance: "none", borderRadius: 0,
        }}
      >
        {cycles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}{!c.meaningful ? " · limited data" : ""}
          </option>
        ))}
        {fullYearAvailable && <option value="year">Full year {periodLabel} (pooled)</option>}
      </select>
      <span aria-hidden style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--purple)", fontSize: 12 }}>▾</span>
    </div>
  );
}
