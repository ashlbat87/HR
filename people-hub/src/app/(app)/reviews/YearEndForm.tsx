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
  employeeName: string;
  employeeRole: string;
  managerName: string;
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
  const showForward = showManagerSections;
  const firstName = props.employeeName.split(" ")[0] || props.employeeName;
  const initials = props.employeeName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  async function handle(fn: () => Promise<{ ok: true } | { error: string }>, msg: string) {
    setBusy(true); setError(null); setNotice(null);
    const res = await fn();
    setBusy(false);
    if ("error" in res) { setError(res.error); return false; }
    if (msg) setNotice(msg);
    return true;
  }

  const byQuarter: Record<string, QuarterRow | null> = { Q1: null, Q2: null, Q3: null, Q4: null };
  for (const q of props.quarters) {
    const key = ALL_QUARTERS.find((qq) => q.label.startsWith(qq));
    if (key) byQuarter[key] = q;
  }
  const scoreDigit = (v: number | null) => (v !== null ? v.toFixed(1) : "—");

  const heroLine = archived
    ? "The record of this year's review conversation."
    : isEmp
    ? "A year worth looking back on. Let's talk through how it went, and what comes next."
    : `A look back on ${firstName}'s year, and a conversation about what's next.`;

  const reflectIcon = (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--purple-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
      <div style={{ width: 16, height: 16, border: "2px solid var(--purple-dark)", borderRadius: "50% 50% 50% 2px" }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {error ? <div className="chip status-overdue" style={{ display: "block", marginBottom: 16 }}>{error}</div> : null}
      {notice ? <div className="chip status-completed" style={{ display: "block", marginBottom: 16 }}>{notice}</div> : null}

      {/* HERO */}
      {archived ? (
        <div style={{ background: "var(--purple-subtle)", border: "0.5px solid #E0DCF8", borderRadius: 18, padding: "30px 34px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "#69F7C3" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", border: "2px solid #69F7C3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 600, color: "var(--purple-dark)" }}>{initials}</div>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--purple-dark)" }}>2026 · In review</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: "#1D102C" }}>{props.employeeName}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{props.employeeRole} · with {props.managerName}</div>
              </div>
            </div>
            <span className="chip status-completed">Archived · read only</span>
          </div>
        </div>
      ) : (
        <div style={{ background: "linear-gradient(135deg,#1D102C 0%,#4E42AF 60%,#6252DB 100%)", borderRadius: 18, padding: "44px 40px", color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -30, width: 190, height: 190, borderRadius: "50%", background: "rgba(105,247,195,0.16)" }} />
          <div style={{ position: "absolute", bottom: -70, right: 80, width: 130, height: 130, borderRadius: "50%", background: "rgba(105,247,195,0.08)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, width: 5, height: "100%", background: "#69F7C3" }} />
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#69F7C3", marginBottom: 20 }}>2026 · In review</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "2px solid #69F7C3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600 }}>{initials}</div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>{props.employeeName}</div>
              <div style={{ fontSize: 14, opacity: 0.82 }}>{props.employeeRole} · with {props.managerName}</div>
            </div>
          </div>
          <div style={{ fontSize: 16, opacity: 0.92, maxWidth: 430, lineHeight: 1.5 }}>{heroLine}</div>
        </div>
      )}

      {/* JOURNEY */}
      <div style={{ padding: "38px 6px 34px" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 22 }}>The year, quarter by quarter</div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {ALL_QUARTERS.map((q, i) => {
            const row = byQuarter[q];
            const done = row && row.quarterlyScore !== null;
            const nextDone = i < 3 && byQuarter[ALL_QUARTERS[i + 1]] && byQuarter[ALL_QUARTERS[i + 1]]!.quarterlyScore !== null;
            return (
              <div key={q} style={{ display: "contents" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: done ? 14 : 11, height: done ? 14 : 11, borderRadius: "50%", background: done ? "var(--purple)" : "var(--n30)", margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 13, fontWeight: done ? 600 : 400, color: done ? "var(--text)" : "var(--n50)" }}>{q}</div>
                  <div style={{ fontSize: 12, color: done ? "var(--muted)" : "var(--n40)" }}>{done ? row!.quarterlyScore!.toFixed(1) : "—"}</div>
                </div>
                {i < 3 ? <div style={{ flex: 1, height: 2, background: done ? "var(--purple)" : "var(--n30)", opacity: nextDone ? 1 : 0.5, marginBottom: 26 }} /> : null}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, textAlign: "center" }}>
          {props.quartersCompleted === 0 ? "The year is just beginning." : `Based on ${props.quartersCompleted} of 4 completed quarters.`}
        </div>
      </div>

      {/* MEASURES */}
      <div style={{ padding: "34px 40px", background: "#F7F8FA", borderRadius: 16 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 26, textAlign: "center" }}>Two measures of the year, held side by side, never blended.</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 64, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--purple-dark)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Performance</div>
            <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1, color: "#1D102C" }}>{scoreDigit(props.annualPerformanceScore)}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{isEmp && !archived ? "what you delivered" : "annual"}</div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--purple-dark)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Values{!props.valuesComplete ? " (pending)" : ""}</div>
            <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1, color: "#1D102C" }}>{scoreDigit(props.valuesScore)}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{isEmp && !archived ? "how you showed up" : "assessment"}</div>
          </div>
        </div>
      </div>

      {/* REFLECTION HEART */}
      <div style={{ padding: "44px 4px 30px" }}>
        {reflectIcon}
        {!archived ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, marginBottom: 8, maxWidth: 460 }}>{isEmp ? "Looking back on your year, what stands out?" : `${firstName}'s reflection`}</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>Think about what you're proud of, what stretched you, and where you'd like to grow.</div>
          </>
        ) : <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{firstName}'s reflection</div>}
        {isEmp && !empLocked ? (
          <textarea value={empSelf} rows={5} disabled={busy} onChange={(e) => setEmpSelf(e.target.value)} placeholder="Take a moment to reflect…" style={{ width: "100%", lineHeight: 1.7, fontSize: 15, padding: 16, borderRadius: 12 }} />
        ) : (
          <div style={{ fontSize: 15, lineHeight: 1.75, color: empSelf ? "var(--text)" : "var(--muted)", whiteSpace: "pre-wrap" }}>{empSelf || "Not yet provided."}</div>
        )}
      </div>

      {/* MANAGER'S VOICE */}
      {showManagerSections ? (
        <>
          <div style={{ padding: "10px 4px 30px" }}>
            {!archived ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, marginBottom: 8, maxWidth: 460 }}>How did this year go, in your words?</div>
                <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>Recognise the impact they had, and be honest about the whole picture.</div>
              </>
            ) : <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Manager's assessment</div>}
            {!isEmp && !mgrLocked ? (
              <textarea value={mgrAssess} rows={5} disabled={busy} onChange={(e) => setMgrAssess(e.target.value)} placeholder="Reflect on the year…" style={{ width: "100%", lineHeight: 1.7, fontSize: 15, padding: 16, borderRadius: 12 }} />
            ) : (
              <div style={{ fontSize: 15, lineHeight: 1.75, color: mgrAssess ? "var(--text)" : "var(--muted)", whiteSpace: "pre-wrap" }}>{mgrAssess || "Not yet provided."}</div>
            )}
          </div>
          <div style={{ padding: "10px 4px 30px" }}>
            {!archived ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, marginBottom: 8, maxWidth: 460 }}>Where is the biggest opportunity to grow?</div>
                <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>One or two areas that would make the most difference next year. Optional.</div>
              </>
            ) : <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Areas for growth</div>}
            {!isEmp && !mgrLocked ? (
              <textarea value={growth} rows={4} disabled={busy} onChange={(e) => setGrowth(e.target.value)} placeholder="Optional…" style={{ width: "100%", lineHeight: 1.7, fontSize: 15, padding: 16, borderRadius: 12 }} />
            ) : (
              <div style={{ fontSize: 15, lineHeight: 1.75, color: growth ? "var(--text)" : "var(--muted)", whiteSpace: "pre-wrap" }}>{growth || "Not provided."}</div>
            )}
          </div>
        </>
      ) : null}

      {/* WHERE NEXT */}
      {showForward ? (
        <div style={{ padding: "26px 28px", background: "#EBFDF6", border: "0.5px solid #B6F2DC", borderRadius: 16, position: "relative", overflow: "hidden", marginTop: 4 }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "#69F7C3" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "#69F7C3", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A6B4A", fontSize: 14 }}>→</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#0A5C40" }}>Where next</div>
          </div>
          <div style={{ fontSize: 14, color: "#3A5A4E", marginBottom: (!isEmp && !mgrLocked) ? 14 : 0, maxWidth: 460, lineHeight: 1.5 }}>What does next year look like? The goals and commitments you've agreed together for 2027.</div>
          {!isEmp && !mgrLocked ? (
            <textarea value={devPlan} rows={4} disabled={busy} onChange={(e) => setDevPlan(e.target.value)} placeholder="The plan you've agreed together…" style={{ width: "100%", lineHeight: 1.7, fontSize: 15, padding: 14, borderRadius: 10 }} />
          ) : (
            <div style={{ fontSize: 15, lineHeight: 1.75, color: devPlan ? "#1D3A2E" : "var(--muted)", whiteSpace: "pre-wrap" }}>{devPlan || "To be agreed."}</div>
          )}
        </div>
      ) : null}

      {/* ACTIONS */}
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "0.5px solid var(--border)" }}>
        {archived ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="chip status-completed">Archived {props.acknowledgedAt ? new Date(props.acknowledgedAt).toLocaleDateString() : ""} · read only</span>
            {props.canReopenArchived ? (
              <button className="btn secondary" disabled={busy} onClick={() => handle(() => reopenArchivedYearEndAction(props.reviewId, "HR reopened archived summary"), "Reopened.")}>HR: reopen</button>
            ) : null}
          </div>
        ) : isEmp ? (
          !empLocked ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn secondary" disabled={busy} onClick={() => handle(() => saveEmployeeYearEndDraftAction(props.reviewId, empSelf), "Draft saved.")}>Save draft</button>
              <button disabled={busy} onClick={() => handle(() => submitYearEndWithDraftAction(props.reviewId, empSelf), "Shared with your manager.")}>Share with manager</button>
            </div>
          ) : props.status === "COMPLETE" ? (
            props.acknowledgedAt ? <span className="chip status-completed">Acknowledged</span> :
            <button disabled={busy} onClick={() => handle(() => acknowledgeYearEndAction(props.reviewId), "Acknowledged. This summary is now archived.")}>Acknowledge I have seen this summary</button>
          ) : <p className="muted">Shared. Awaiting your manager.</p>
        ) : (
          !mgrLocked ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn secondary" disabled={busy} onClick={() => handle(() => saveManagerYearEndDraftAction(props.reviewId, { managerOverallAssessment: mgrAssess, areasForGrowth: growth, developmentPlan: devPlan }), "Draft saved.")}>Save draft</button>
              <button disabled={busy} onClick={() => handle(() => completeYearEndWithDraftAction(props.reviewId, { managerOverallAssessment: mgrAssess, areasForGrowth: growth, developmentPlan: devPlan }), "Completed.")}>Complete review</button>
            </div>
          ) : <p className="muted">This summary is {props.status.toLowerCase()}.</p>
        )}
      </div>
    </div>
  );
}