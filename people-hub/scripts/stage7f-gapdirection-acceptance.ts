// Stage 7f acceptance — verifies computeGapDirection against a hand-computed fixture.
// Pure function test (no DB): builds ReviewDatum[] directly. gap = manager - self.

import { computeGapDirection, type GapDirectionReport } from "../src/modules/performance/reporting-queries";

type R = { name: string; expected: string; actual: string; pass: boolean };
const results: R[] = [];
function check(name: string, expected: unknown, actual: unknown) {
  const e = JSON.stringify(expected), a = JSON.stringify(actual);
  results.push({ name, expected: e, actual: a, pass: e === a });
}
function approx(name: string, expected: number | null, actual: number | null, tol = 0.01) {
  const pass = (expected == null && actual == null) || (expected != null && actual != null && Math.abs(expected - actual) < tol);
  results.push({ name, expected: String(expected), actual: String(actual), pass });
}

// Minimal ReviewDatum factory (only fields computeGapDirection reads).
function datum(id: string, dept: string | null, manager: number, self: number | null): any {
  return { reviewId: id, employeeId: id + "e", employeeName: "Emp " + id, managerId: id + "m", managerName: "Mgr", department: dept, func: null, managerScore: manager, selfScore: self };
}

function main() {
  // Fixture (gap = manager - self):
  //  Eng: R1 m4 s3 (+1 mgr-higher, size1) ; R2 m5 s5 (0 agreed) ; R3 m3 s5 (-2 emp-higher, size2)
  //  Ops: R4 m2 s4 (-2 emp-higher, size2) ; R5 m3 s3 (0 agreed)
  //  R6 no self (excluded)
  const data = [
    datum("R1", "Engineering", 4, 3),
    datum("R2", "Engineering", 5, 5),
    datum("R3", "Engineering", 3, 5),
    datum("R4", "Operations", 2, 4),
    datum("R5", "Operations", 3, 3),
    datum("R6", "Engineering", 4, null),
  ];
  const r: GapDirectionReport = computeGapDirection(data);

  // total = 5 (R6 excluded)
  check("total = 5", 5, r.total);
  // gaps: +1, 0, -2, -2, 0 -> mean = -3/5 = -0.6
  approx("averageGap = -0.6", -0.6, r.averageGap);
  // direction: mgr-higher 1 (R1), agreed 2 (R2,R5), emp-higher 2 (R3,R4)
  check("direction", { employeeHigher: 2, agreed: 2, managerHigher: 1 }, r.direction);
  // size: zero 2 (R2,R5), one 1 (R1), twoPlus 2 (R3,R4)
  check("size", { zero: 2, one: 1, twoPlus: 2 }, r.size);
  // byDepartment (signed avg, sorted desc):
  //  Engineering gaps [+1,0,-2] -> mean -1/3 = -0.333, n3
  //  Operations gaps [-2,0] -> mean -1.0, n2
  //  sorted desc by avg: Engineering (-0.333) before Operations (-1.0)
  check("dept order", ["Engineering", "Operations"], r.byDepartment.map((d) => d.department));
  check("Eng n=3", 3, r.byDepartment[0].n);
  approx("Eng avg = -0.333", -1 / 3, r.byDepartment[0].averageGap);
  check("Ops n=2", 2, r.byDepartment[1].n);
  approx("Ops avg = -1.0", -1.0, r.byDepartment[1].averageGap);

  const passed = results.filter((x) => x.pass).length;
  console.log(`\n=== STAGE 7f GAP DIRECTION: ${passed}/${results.length} passed ===`);
  for (const x of results) console.log(`  ${x.pass ? "PASS" : "FAIL"}  ${x.name}${x.pass ? "" : `  (expected ${x.expected}, got ${x.actual})`}`);
  if (passed !== results.length) process.exit(1);
}
main();
