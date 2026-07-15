"use client";

import { useState } from "react";
import {
  saveEmployeeYearEndDraftAction,
  submitYearEndWithDraftAction,
  saveManagerYearEndDraftAction,
  completeYearEndWithDraftAction,
  acknowledgeYearEndAction,
  reopenArchivedYearEndAction,
} from "./actions";

interface QuarterRow { label: string; quarterlyScore: number | null; }
interface Props {
  reviewId: string;
  mode: "employee" | "manager";
  status: string;
  isEmployee: boolean;
  canReopenArchived: boolean;
  quarters: QuarterRow[];
  quartersCompleted: number;
  annualPerformanceScore: number | null;
  valuesScore: number | null;
  valuesComplete: boolean;
  employeeOverallAssessment: string;
  managerOverallAssessment: string;
  areasForGrowth: string;
  developmentPlan: string;
  acknowledgedAt: string | null;
}

const RATING_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };
const ALL_QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export function YearEndForm(props: Props) {
  const isEmp = props.mode === "employee";
  const [empSelf, setEmpSelf] = useState(props.employeeOverallAssessment);
  const [mgrAssess, setMgrAssess] = useState(props.managerOverallAssessment);
  const [growth, setGrowth] = useState(props.areasForGrowth);
  const [devPlan, setDevPlan] = useState(props.developmentPlan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const empLocked = !["NOT_STARTED", "IN_PROGRESS"].includes(props.status);
  const mgrLocked = !["AWAITING_MANAGER", "REOPENED"].includes(props.status);
  const archived = props.status === "ARCHIVED";
  const showManagerSections = !isEmp || empLocked;

  async function handle(fn: () => Promise<{ ok: true } | { error: string }>, msg: string) {
    setBusy(true); setError(null); setNotice(null);
    const res = await fn();
    setBusy(false);
    if ("error" in res) { setError(res.error); return false; }
    if (msg) setNotice(msg);
    return true;
  }

  // Map each quarter to its completed review (if any).
  const byQuarter: Record<string, QuarterRow | null> = { Q1: null, Q2: null, Q3: null, Q4: null };
  for (const q of props.quarters) {
    const key = ALL_QUARTERS.find((qq) => q.label.startsWith(qq));
    if (key) byQuarter[key] = q;
  }

  const openingLive =
    props.quartersCompleted === 0
      ? "Your year is just beginning — no quarters recorded yet."
      : `Across your year so far, ${props.quartersCompleted} quarter${props.quartersCompleted === 1 ? "" : "s"} recorded.`;
  const openingArchived = `Performance across the year — based on ${props.quartersCompleted} of 4 completed quarters.`;

  const scoreDigit = (v: number | null) => (v !== null ? v.toFixed(1) : "—");

  return (
    <div style={{ maxWidth: 720 }}>
      {error ? <div className="chip status-overdue" style={{ display: "block", marginBottom: 16 }}>{error}</div> : null}
      {notice ? <div className="chip status-completed" style={{ display: "block", marginBottom: 16 }}>{notice}</div> : null}

      {/* OPENING */}
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 6 }}>
        Year-end summary · 2026
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, marginBottom: 30 }}>
        {archived ? "Year-end record" : "Your year"}
      </div>

      {/* JOURNEY */}
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
        {archived ? openingArchived : openingLive}
      </div>
      <div style={{ display: "flex", gap: 18, marginBottom: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 5 }}>
          {ALL_QUARTERS.map((q, i) => {
            const done = byQuarter[q] !== null;
            return (
              <div key={q} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: i < 3 ? 1 : "0" }}>
                <div style={{ width: done ? 13 : 11, height: done ? 13 : 11, borderRadius: "50%", background: done ? "var(--purple)" : "var(--n30)" }} />
                {i < 3 ? <div style={{ width: 2, flex: 1, minHeight: 22, background: "var(--border)" }} /> : null}
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {ALL_QUARTERS.map((q) => {
            const row = byQuarter[q];
            if (row && row.quarterlyScore !== null) {
              return (
                <div key={q} style={{ minHeight: 22 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 14, color: "var(--muted)" }}> — {row.quarterlyScore.toFixed(1)}{archived ? ` (${RATING_LABEL[Math.round(row.quarterlyScore)] ?? ""})` : `, ${RATING_LABEL[Math.round(row.quarterlyScore)] ?? ""}`}</span>
                </div>
              );
            }
            return (
              <div key={q} style={{ minHeight: 22, fontSize: 14, color: "var(--n50)" }}>
                {q} — no review recorded
              </div>
            );
          })}
        </div>
      </div>

      {/* PIVOT — the two scores */}
      <div style={{ textAlign: "center", padding: "38px 0 34px", margin: "22px 0", borderTop: "0.5px solid var(--border)", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 22 }}>
          {archived ? "Two measures, recorded separately." : "Two measures of your year, read together."}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 56, alignItems: "stretch" }}>
          <div>
            <div style={{ fontSize: 44, fontWeight: 600, lineHeight: 1 }}>{scoreDigit(props.annualPerformanceScore)}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{isEmp && !archived ? "what you delivered" : "annual performance"}</div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div>
            <div style={{ fontSize: 44, fontWeight: 600, lineHeight: 1 }}>{scoreDigit(props.valuesScore)}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{isEmp && !archived ? "how you showed up" : "values"}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--n60)", marginTop: 18 }}>
          Performance and values are recorded separately and never blended.
          {!props.valuesComplete ? " Values review not yet complete." : ""}
        </div>
      </div>

      {/* VOICES */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          {isEmp && !archived ? "In your words" : "Employee self-assessment"} {isEmp && !empLocked ? <span className="muted" style={{ fontWeight: 400 }}>· required</span> : null}
        </div>
        {isEmp && !empLocked ? (
          <textarea value={empSelf} rows={5} disabled={busy} onChange={(e) => setEmpSelf(e.target.value)} placeholder="Your reflection on the year" style={{ width: "100%", lineHeight: 1.6 }} />
        ) : (
          <div style={{ fontSize: 14, lineHeight: 1.7, color: empSelf ? "var(--text)" : "var(--muted)", whiteSpace: "pre-wrap", marginBottom: 22 }}>{empSelf || "Not provided."}</div>
        )}
      </div>

      {showManagerSections ? (
        <>
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Manager overall assessment {!isEmp && !mgrLocked ? <span className="muted" style={{ fontWeight: 400 }}>· required</span> : null}</div>
            {!isEmp && !mgrLocked ? (
              <textarea value={mgrAssess} rows={5} disabled={busy} onChange={(e) => setMgrAssess(e.target.value)} style={{ width: "100%", lineHeight: 1.6 }} />
            ) : (
              <div style={{ fontSize: 14, lineHeight: 1.7, color: mgrAssess ? "var(--text)" : "var(--muted)", whiteSpace: "pre-wrap" }}>{mgrAssess || "Not provided."}</div>
            )}
          </div>
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Areas for growth <span className="muted" style={{ fontWeight: 400 }}>· optional</span></div>
            {!isEmp && !mgrLocked ? (
              <textarea value={growth} rows={4} disabled={busy} onChange={(e) => setGrowth(e.target.value)} style={{ width: "100%", lineHeight: 1.6 }} />
            ) : (
              <div style={{ fontSize: 14, lineHeight: 1.7, color: growth ? "var(--text)" : "var(--muted)", whiteSpace: "pre-wrap" }}>{growth || "Not provided."}</div>
            )}
          </div>
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{archived || isEmp ? "Development plan — 2027" : "Looking ahead — development plan"} {!isEmp && !mgrLocked ? <span className="muted" style={{ fontWeight: 400 }}>· required</span> : null}</div>
            {!isEmp && !mgrLocked ? (
              <textarea value={devPlan} rows={4} disabled={busy} onChange={(e) => setDevPlan(e.target.value)} style={{ width: "100%", lineHeight: 1.6 }} />
            ) : (
              <div style={{ fontSize: 14, lineHeight: 1.7, color: devPlan ? "var(--text)" : "var(--muted)", whiteSpace: "pre-wrap" }}>{devPlan || "Not provided."}</div>
            )}
          </div>
        </>
      ) : null}

      {/* ACTIONS */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: "0.5px solid var(--border)" }}>
        {archived ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="chip status-completed">Archived {props.acknowledgedAt ? new Date(props.acknowledgedAt).toLocaleDateString() : ""} · read-only</span>
            {props.canReopenArchived ? (
              <button className="btn secondary" disabled={busy} onClick={() => handle(() => reopenArchivedYearEndAction(props.reviewId, "HR reopened archived summary"), "Reopened.")}>HR: reopen</button>
            ) : null}
          </div>
        ) : isEmp ? (
          !empLocked ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn secondary" disabled={busy} onClick={() => handle(() => saveEmployeeYearEndDraftAction(props.reviewId, empSelf), "Draft saved.")}>Save draft</button>
              <button disabled={busy} onClick={() => handle(() => submitYearEndWithDraftAction(props.reviewId, empSelf), "Submitted to your manager.")}>Submit to manager</button>
            </div>
          ) : props.status === "COMPLETE" ? (
            props.acknowledgedAt ? <span className="chip status-completed">Acknowledged</span> :
            <button disabled={busy} onClick={() => handle(() => acknowledgeYearEndAction(props.reviewId), "Acknowledged. This summary is now archived.")}>Acknowledge I have seen this summary</button>
          ) : <p className="muted">Submitted. Awaiting your manager.</p>
        ) : (
          !mgrLocked ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn secondary" disabled={busy} onClick={() => handle(() => saveManagerYearEndDraftAction(props.reviewId, { managerOverallAssessment: mgrAssess, areasForGrowth: growth, developmentPlan: devPlan }), "Draft saved.")}>Save draft</button>
              <button disabled={busy} onClick={() => handle(() => completeYearEndWithDraftAction(props.reviewId, { managerOverallAssessment: mgrAssess, areasForGrowth: growth, developmentPlan: devPlan }), "Completed.")}>Complete summary</button>
            </div>
          ) : <p className="muted">This summary is {props.status.toLowerCase()}.</p>
        )}
      </div>
    </div>
  );
}