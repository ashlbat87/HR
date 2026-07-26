"use client";
// First-class timeframe filter (v0.8, PD-023). Shows the current selection and makes
// alternative timeframes discoverable/switchable. Writes the choice to the URL (?cycle=<id>
// or ?scope=year) so it carries across reports and into drill-down. Not a status label.

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
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Timeframe</span>
      <select
        value={value}
        onChange={onChange}
        style={{
          fontSize: 13, fontWeight: 500, padding: "6px 10px", borderRadius: "var(--radius-sm)",
          border: "0.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer",
        }}
      >
        {cycles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}{c.isOpen ? " (open)" : ""}{!c.meaningful ? " · limited data" : ""}
          </option>
        ))}
        {fullYearAvailable && <option value="year">Full year {periodLabel} (pooled)</option>}
      </select>
    </div>
  );
}
