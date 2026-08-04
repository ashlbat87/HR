// v0.9 synthetic-workbook generator (TEST TOOLING — no real data).
// Builds filled copies of the review template in code (no binary template needed), with KNOWN
// values so the extractor/harness can assert exact results. Produces clean + partial + three
// quarantine cases, plus an EXPECTATIONS.json manifest. Output: scripts/synthetic-workbooks/
// (gitignored). Run: npx tsx scripts/generate-synthetic-workbooks.ts

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { CRIT_ROWS, QUARTER_SHEETS, VALUES, type QuarterSheet } from "./lib/review-template-anchors";

const OUT = path.join(__dirname, "synthetic-workbooks");

type Person = { name?: string; role: string; dept: string; manager: string };
type Pair = [number, number | null]; // [managerRating, selfRating|null]
type QuarterRatings = Partial<Record<"impact" | "quality" | "delivery", Pair>>;
type Mess = "text_rating" | "no_name" | null;

function setCell(ws: XLSX.WorkSheet, addr: string, v: string | number | undefined): void {
  if (v === null || v === undefined) return;
  ws[addr] = { t: typeof v === "number" ? "n" : "s", v } as XLSX.CellObject;
}

function quarterSheet(person: Person, sheet: QuarterSheet, ratings: QuarterRatings | null, mess: Mess): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const rows = CRIT_ROWS[sheet];
  setCell(ws, "B2", "QUARTERLY PERFORMANCE REVIEW");
  setCell(ws, "B4", "Name:"); setCell(ws, "C4", person.name);
  setCell(ws, "B5", "Role:"); setCell(ws, "C5", person.role);
  setCell(ws, "B6", "Department:"); setCell(ws, "C6", person.dept);
  setCell(ws, "B7", "Manager:"); setCell(ws, "C7", person.manager);
  (["impact", "quality", "delivery"] as const).forEach((crit) => {
    const r = rows[crit];
    setCell(ws, "B" + r, crit.toUpperCase());
    const pair = ratings ? ratings[crit] : null;
    if (pair) {
      let mgr: string | number = pair[0];
      if (mess === "text_rating" && crit === "impact" && sheet === "Q3 Review") mgr = `${pair[0]} - Advanced`;
      setCell(ws, "C" + r, mgr);
      setCell(ws, "D" + r, `${crit} mgr comment`);
      if (pair[1] != null) { setCell(ws, "E" + r, pair[1]); setCell(ws, "F" + r, `${crit} self comment`); }
    }
  });
  ws["!ref"] = "A1:K50";
  return ws;
}

function valuesSheet(vr: Partial<Record<string, Pair>> | null): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  setCell(ws, "B2", "VALUES REVIEW — COMPLETED ANNUALLY (End of Q4)");
  setCell(ws, "B6", "Value");
  for (const v of VALUES.values) {
    setCell(ws, "B" + v.row, v.label);
    const pair = vr ? vr[v.key] : null;
    if (pair) {
      setCell(ws, VALUES.mgrCol + v.row, pair[0]);
      if (pair[1] != null) setCell(ws, VALUES.selfCol + v.row, pair[1]);
    }
  }
  ws["!ref"] = "A1:F11";
  return ws;
}

function makeWorkbook(person: Person, perQuarter: Partial<Record<QuarterSheet, QuarterRatings>>, valuesR: Partial<Record<string, Pair>> | null, mess: Mess): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const sheet of QUARTER_SHEETS) {
    const p = mess === "no_name" ? { ...person, name: undefined } : person;
    XLSX.utils.book_append_sheet(wb, quarterSheet(p, sheet, perQuarter[sheet] ?? null, mess), sheet);
  }
  XLSX.utils.book_append_sheet(wb, valuesSheet(valuesR), VALUES.sheet);
  return wb;
}

// --- Known synthetic people (names must match what the harness seeds as Hub employees,
//     EXCEPT Dave, who is deliberately absent to exercise the "not found" quarantine). ---
const alice: Person = { name: "Alice Tester", role: "Engineer", dept: "Engineering", manager: "Manager One" };
const aliceQ: Partial<Record<QuarterSheet, QuarterRatings>> = {
  "Q1 Review": { impact: [4, 3], quality: [4, 4], delivery: [5, 4] },
  "Q2 Review": { impact: [3, 3], quality: [4, 3], delivery: [4, 4] },
  "Q3 Review": { impact: [5, 5], quality: [4, 4], delivery: [4, 5] },
  "Q4 Review": { impact: [4, 4], quality: [5, 4], delivery: [5, 5] },
};
const aliceV: Partial<Record<string, Pair>> = { innovate: [4, 4], results: [5, 4], customers: [4, 4], collective: [5, 5] };

const bob: Person = { name: "Bob Sample", role: "Analyst", dept: "Operations", manager: "Manager One" };
const bobQ: Partial<Record<QuarterSheet, QuarterRatings>> = {
  "Q1 Review": { impact: [3, 3], quality: [3, 4], delivery: [3, 3] },
  "Q2 Review": { impact: [4, 3], quality: [3, 3], delivery: [4, 4] },
};

const carol: Person = { name: "Carol Messy", role: "PM", dept: "Product", manager: "Manager One" };
const dave: Person = { name: "Dave Unknown", role: "Rep", dept: "Sales", manager: "Manager One" };

function round1(xs: number[]): number { return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10; }

function main(): void {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  XLSX.writeFile(makeWorkbook(alice, aliceQ, aliceV, null), path.join(OUT, "alice_tester.xlsx"));
  XLSX.writeFile(makeWorkbook(bob, bobQ, null, null), path.join(OUT, "bob_sample.xlsx"));
  XLSX.writeFile(makeWorkbook(carol, aliceQ, aliceV, "text_rating"), path.join(OUT, "carol_messy.xlsx"));
  XLSX.writeFile(makeWorkbook(alice, aliceQ, aliceV, "no_name"), path.join(OUT, "no_name.xlsx"));
  XLSX.writeFile(makeWorkbook(dave, aliceQ, aliceV, null), path.join(OUT, "dave_unknown.xlsx"));

  const manifest = {
    "alice_tester.xlsx": {
      expect: "import_ok", name: "Alice Tester",
      quarterlyOfficial: {
        "Q1 Review": round1([4, 4, 5]), "Q2 Review": round1([3, 4, 4]),
        "Q3 Review": round1([5, 4, 4]), "Q4 Review": round1([4, 5, 5]),
      },
    },
    "bob_sample.xlsx": { expect: "import_ok_partial", name: "Bob Sample", quartersPresent: ["Q1 Review", "Q2 Review"] },
    "carol_messy.xlsx": { expect: "quarantine", reason: "non-numeric rating (Q3 impact)" },
    "no_name.xlsx": { expect: "quarantine", reason: "missing employee name" },
    "dave_unknown.xlsx": { expect: "quarantine", reason: "employee not found in Hub" },
  };
  fs.writeFileSync(path.join(OUT, "EXPECTATIONS.json"), JSON.stringify(manifest, null, 2));
  console.log("Generated:", fs.readdirSync(OUT).sort().join(", "));
}

main();
