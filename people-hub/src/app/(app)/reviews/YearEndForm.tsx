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

interface QuarterRow {
  label: string;
  quarterlyScore: number | null;
}
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

  async function handle(fn: () => Promise<{ ok: true } | { error: string }>, msg: string) {
    setBusy(true); setError(null); setNotice(null);
    const res = await fn();
    setBusy(false);
    if ("error" in res) { setError(res.error); return false; }
    if (msg) setNotice(msg);
    return true;
  }

  const RATING_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };

  return (
    <div>
      {error ? <div className="chip status-overdue" style={{ display: "block", marginBottom: 12 }}>{error}</div> : null}
      {notice ? <div className="chip status-completed" style={{ display: "block", marginBottom: 12 }}>{notice}</div> : null}

      {/* Quarterly performance table (read-only) */}
      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Quarterly performance</div>
        <table>
          <thead><tr><th>Quarter</th><th>Q Score</th><th>Rating label</th></tr></thead>
          <tbody>
            {props.quarters.length === 0 ? (
              <tr><td colSpan={3} className="muted">No completed quarterly reviews yet.</td></tr>
            ) : props.quarters.map((q) => (
              <tr key={q.label}>
                <td>{q.label}</td>
                <td>{q.quarterlyScore !== null ? q.quarterlyScore.toFixed(1) : "—"}</td>
                <td className="muted">{q.quarterlyScore !== null ? RATING_LABEL[Math.round(q.quarterlyScore)] ?? "—" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Two year-end scores — read together, not blended */}
      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Your two year-end scores</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Read together, not blended. Performance reflects what you delivered; values reflects how you showed up. Each is shown on its own terms.</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 28, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{props.annualPerformanceScore !== null ? props.annualPerformanceScore.toFixed(1) : "—"}</div>
            <div className="muted" style={{ fontSize: 12 }}>Annual performance · what you delivered</div>
            <div className="muted" style={{ fontSize: 11 }}>Average of {props.quartersCompleted} of 4 quarters</div>
          </div>
          <div style={{ width: 1, height: 40, background: "var(--border)" }} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{props.valuesScore !== null ? props.valuesScore.toFixed(1) : "—"}</div>
            <div className="muted" style={{ fontSize: 12 }}>Values · how you showed up</div>
            <div className="muted" style={{ fontSize: 11 }}>{props.valuesComplete ? "Annual values assessment" : "Values review not yet complete"}</div>
          </div>
        </div>
      </div>

      {/* Narrative sections */}
      <div className="card">
        <label className="field">
          <span>Employee overall self-assessment {isEmp ? <span className="muted">(required)</span> : null}</span>
          <textarea value={empSelf} rows={4} disabled={!isEmp || empLocked || busy} onChange={(e) => setEmpSelf(e.target.value)} placeholder={isEmp ? "Your reflection on the year" : ""} />
        </label>
        {!isEmp || empLocked ? (
          <>
            <label className="field">
              <span>Manager overall assessment {!isEmp ? <span className="muted">(required)</span> : null}</span>
              <textarea value={mgrAssess} rows={4} disabled={isEmp || mgrLocked || busy} onChange={(e) => setMgrAssess(e.target.value)} />
            </label>
            <label className="field">
              <span>Areas for growth / development needs <span className="muted">(optional)</span></span>
              <textarea value={growth} rows={3} disabled={isEmp || mgrLocked || busy} onChange={(e) => setGrowth(e.target.value)} />
            </label>
            <label className="field">
              <span>Development plan — goals & commitments {!isEmp ? <span className="muted">(required)</span> : null}</span>
              <textarea value={devPlan} rows={3} disabled={isEmp || mgrLocked || busy} onChange={(e) => setDevPlan(e.target.value)} />
            </label>
          </>
        ) : null}
      </div>

      {/* Actions */}
      {archived ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="chip status-completed">Archived {props.acknowledgedAt ? new Date(props.acknowledgedAt).toLocaleDateString() : ""} · read-only</span>
          {props.canReopenArchived ? (
            <button className="btn secondary" disabled={busy} onClick={() => handle(() => reopenArchivedYearEndAction(props.reviewId, "HR reopened archived summary"), "Reopened.")}>HR: reopen</button>
          ) : null}
        </div>
      ) : isEmp ? (
        !empLocked ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn secondary" disabled={busy} onClick={() => handle(() => saveEmployeeYearEndDraftAction(props.reviewId, empSelf), "Draft saved.")}>Save draft</button>
            <button disabled={busy} onClick={() => handle(() => submitYearEndWithDraftAction(props.reviewId, empSelf), "Submitted to your manager.")}>Submit to manager</button>
          </div>
        ) : props.status === "COMPLETE" ? (
          props.acknowledgedAt ? <span className="chip status-completed">Acknowledged</span> :
          <button disabled={busy} onClick={() => handle(() => acknowledgeYearEndAction(props.reviewId), "Acknowledged. This summary is now archived.")}>Acknowledge I have seen this summary</button>
        ) : <p className="muted">Submitted. Awaiting your manager.</p>
      ) : (
        !mgrLocked ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn secondary" disabled={busy} onClick={() => handle(() => saveManagerYearEndDraftAction(props.reviewId, { managerOverallAssessment: mgrAssess, areasForGrowth: growth, developmentPlan: devPlan }), "Draft saved.")}>Save draft</button>
            <button disabled={busy} onClick={() => handle(() => completeYearEndWithDraftAction(props.reviewId, { managerOverallAssessment: mgrAssess, areasForGrowth: growth, developmentPlan: devPlan }), "Completed.")}>Complete summary</button>
          </div>
        ) : <p className="muted">This summary is {props.status.toLowerCase()}.</p>
      )}
    </div>
  );
}
