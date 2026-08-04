// Shared cell anchors for the 2026 Performance Review template (v0.9 migration).
// Single source of truth: the synthetic-workbook generator AND the extractor both import this,
// so they cannot drift. Verified from 2026_Performance_Review_MASTER.xlsx.
// IMPORTANT: Q1 differs from Q2-Q4 — the criterion data rows shift down by one.

export type Crit = "impact" | "quality" | "delivery";

export const QUARTER_SHEETS = ["Q1 Review", "Q2 Review", "Q3 Review", "Q4 Review"] as const;
export type QuarterSheet = (typeof QUARTER_SHEETS)[number];

// Criterion DATA rows per sheet.
export const CRIT_ROWS: Record<QuarterSheet, Record<Crit, number>> = {
  "Q1 Review": { impact: 19, quality: 23, delivery: 27 },
  "Q2 Review": { impact: 20, quality: 24, delivery: 28 },
  "Q3 Review": { impact: 20, quality: 24, delivery: 28 },
  "Q4 Review": { impact: 20, quality: 24, delivery: 28 },
};

// Header identity cells (same on every quarter sheet): label in col B, value in col C.
export const HEADER = { name: "C4", role: "C5", dept: "C6", manager: "C7" } as const;

// Columns within a criterion row.
export const COL = { mgrRating: "C", mgrComment: "D", selfRating: "E", selfComment: "F" } as const;

// The Values Review sheet.
export const VALUES_SHEET = "Values Review" as const;

// Normalise a person name for matching (trim, collapse internal whitespace, case-fold).
export function normaliseName(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

// Values Review layout (verified from template). Four values, rows 7-10.
// Ratings: manager col D, self col E (col C is the description). Overall (D11/E11) is DERIVED.
export const VALUES = {
  sheet: "Values Review",
  values: [
    { key: "INNOVATE_WITH_IMPACT", label: "Innovate with Impact", row: 7 },
    { key: "DRIVE_EXCEPTIONAL_RESULTS", label: "Drive Exceptional Results", row: 8 },
    { key: "DELIVER_VALUE_TO_CUSTOMERS", label: "Deliver Value to Customers", row: 9 },
    { key: "WIN_COLLECTIVELY", label: "Win Collectively", row: 10 },
  ],
  mgrCol: "D",
  selfCol: "E",
} as const;
export type ValueKey = (typeof VALUES.values)[number]["key"];
