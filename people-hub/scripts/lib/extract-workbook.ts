// v0.9 workbook extractor + validator (PURE — no DB access, fully testable).
// Reads one filled review workbook and returns either a clean structured result or a list of
// quarantine reasons. Whole-file quarantine: ANY invalid value quarantines the entire file
// (all-or-nothing per person). Absent data (empty quarter) is NOT an error — it is skipped.
// Employee identity is read once from the first quarter sheet with a name in C4; the Values
// sheet has no name of its own and inherits the workbook's employee. "Employee not found in
// the Hub" is NOT decided here (needs DB) — that is the importer's job; we surface the name.

import * as XLSX from "xlsx";
import { CRIT_ROWS, QUARTER_SHEETS, HEADER, COL, VALUES, type QuarterSheet, type Crit } from "./review-template-anchors";

export interface QuarterExtract {
  sheet: QuarterSheet;
  crits: Record<Crit, { mgr: number | null; self: number | null }>;
}
export interface ValueExtract { key: string; mgr: number; self: number | null; }
export interface ExtractOk {
  ok: true;
  employeeName: string;
  managerName: string | null;
  department: string | null;
  quarters: QuarterExtract[];
  values: ValueExtract[];
}
export interface ExtractFail { ok: false; employeeName: string | null; reasons: string[]; }
export type ExtractResult = ExtractOk | ExtractFail;

function cellVal(ws: XLSX.WorkSheet, addr: string): unknown {
  const c = ws[addr] as XLSX.CellObject | undefined;
  return c === undefined ? undefined : c.v;
}

function readText(ws: XLSX.WorkSheet, addr: string): string | null {
  const v = cellVal(ws, addr);
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// A rating must be an integer 1-5. Absent (blank) is allowed and returns null.
// Anything else (text like "4 - Advanced", decimals, out-of-range) is invalid.
type RatingCheck = { ok: true; value: number | null } | { ok: false; why: string };
function validateRating(raw: unknown, where: string): RatingCheck {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 5) return { ok: true, value: raw };
  return { ok: false, why: `invalid rating at ${where}: ${JSON.stringify(raw)}` };
}

export function extractWorkbook(wb: XLSX.WorkBook): ExtractResult {
  const reasons: string[] = [];

  // Identity: first quarter sheet with a name in C4.
  let employeeName: string | null = null;
  let managerName: string | null = null;
  let department: string | null = null;
  for (const s of QUARTER_SHEETS) {
    const ws = wb.Sheets[s];
    if (!ws) continue;
    const n = readText(ws, HEADER.name);
    if (n) {
      employeeName = n;
      managerName = readText(ws, HEADER.manager);
      department = readText(ws, HEADER.dept);
      break;
    }
  }
  if (!employeeName) reasons.push("missing employee name");

  // Quarters: read each present sheet; validate every rating.
  const quarters: QuarterExtract[] = [];
  for (const s of QUARTER_SHEETS) {
    const ws = wb.Sheets[s];
    if (!ws) continue;
    const rows = CRIT_ROWS[s];
    const crits = {} as QuarterExtract["crits"];
    let anyMgr = false;
    (["impact", "quality", "delivery"] as Crit[]).forEach((crit) => {
      const r = rows[crit];
      const mgr = validateRating(cellVal(ws, COL.mgrRating + r), `${s} ${crit} manager`);
      const self = validateRating(cellVal(ws, COL.selfRating + r), `${s} ${crit} self`);
      if (!mgr.ok) reasons.push(mgr.why);
      if (!self.ok) reasons.push(self.why);
      const mgrVal = mgr.ok ? mgr.value : null;
      const selfVal = self.ok ? self.value : null;
      if (mgrVal != null) anyMgr = true;
      crits[crit] = { mgr: mgrVal, self: selfVal };
    });
    // A quarter with at least one manager rating counts as reviewed. A fully-empty quarter is
    // simply absent (person not reviewed that quarter) and is skipped, not an error.
    if (anyMgr) quarters.push({ sheet: s, crits });
  }

  // Values (rows 7-10, cols D/E). Sheet may be absent (no values review done).
  const values: ValueExtract[] = [];
  const vs = wb.Sheets[VALUES.sheet];
  if (vs) {
    for (const v of VALUES.values) {
      const mgr = validateRating(cellVal(vs, VALUES.mgrCol + v.row), `values ${v.key} manager`);
      const self = validateRating(cellVal(vs, VALUES.selfCol + v.row), `values ${v.key} self`);
      if (!mgr.ok) reasons.push(mgr.why);
      if (!self.ok) reasons.push(self.why);
      if (mgr.ok && mgr.value != null) values.push({ key: v.key, mgr: mgr.value, self: self.ok ? self.value : null });
    }
  }

  if (reasons.length > 0) return { ok: false, employeeName, reasons };
  return { ok: true, employeeName: employeeName as string, managerName, department, quarters, values };
}

// Convenience: the official (manager) quarterly score = mean of the three manager ratings,
// rounded to 1dp. Matches the app's recompute-not-import rule.
export function quarterlyOfficial(q: QuarterExtract): number | null {
  const xs = (["impact", "quality", "delivery"] as Crit[]).map((c) => q.crits[c].mgr).filter((v): v is number => v != null);
  if (xs.length === 0) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
}
