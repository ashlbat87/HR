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

  // A conversation beat: a purple chapter marker + heading, with content beneath.
  const Beat = ({ step, title, children }: { step: string; title: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", gap: 16, marginBottom: 34 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--purple-subtle)", color: "var(--purple-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>{step}</div>
        <div style={{ width: 2, flex: 1, background: "var(--border)", marginTop: 6 }} />
      </div>
      <div style={{ flex: 1, paddingBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{title}</div>
        {children}
      </div>
    </div>
  );

  // A guided reflection: prompt + supporting line, then editable box or read prose.
  const Reflection = ({ prompt, hint, value, set, editable, placeholder }: any) => (
    <div>
      {!archived ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 3 }}>{prompt}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>{hint}</div>
        </>
      ) : null}
      {editable ? (
        <textarea value={value} rows={5} disabled={busy} onChange={(e) => set(e.target.value)} placeholder={placeholder} style={{ width: "100%", lineHeight: 1.7 }} />
      ) : (
        <div style={{ fontSize: 14, lineHeight: 1.75, color: value ? "var(--text)" : "var(--muted)", whiteSpace: "pre-wrap" }}>{value || "Not yet provided."}</div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 680 }}>
      {error ? <div className="chip status-overdue" style={{ display: "block", marginBottom: 16 }}>{error}</div> : null}
      {notice ? <div className="chip status-completed" style={{ display: "block", marginBottom: 16 }}>{notice}</div> : null}

      {/* OPENING — the person, warmly */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--purple-subtle)", color: "var(--purple-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600 }}>{initials}</div>
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>Year-end review · 2026</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{props.employeeName}</div>
        </div>
      </div>
      <div style={{ fontSize: 15, color: "var(--muted)", marginBottom: 32, marginLeft: 68 }}>
        {archived ? "The record of this year's review conversation." : isEmp ? `Let's look back on your year, ${firstName}.` : `A look back on ${firstName}'s year — and a conversation about what's next.`}
      </div>

      {/* BEAT 1 — the journey */}
      <Beat step="1" title="How the year unfolded">
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          {props.quartersCompleted === 0 ? "The year is just beginning." : `${props.quartersCompleted} quarter${props.quartersCompleted === 1 ? "" : "s"} recorded so far.`}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ALL_QUARTERS.map((q) => {
            const row = byQuarter[q];
            const done = row && row.quarterlyScore !== null;
            return (
              <div key={q} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: done ? "var(--purple)" : "var(--n30)", flexShrink: 0 }} />
                {done ? (
                  <div style={{ fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{row!.label}</span>
                    <span style={{ color: "var(--muted)" }}> — {row!.quarterlyScore!.toFixed(1)}, {RATING_LABEL[Math.round(row!.quarterlyScore!)] ?? ""}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: "var(--n50)" }}>{q} — no review recorded</div>
                )}
              </div>
            );
          })}
        </div>
      </Beat>

      {/* BEAT 2 — the two measures, as a talking point */}
      <Beat step="2" title="Two measures of the year">
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
          Performance and values, each on its own terms. Worth talking through both — they're never blended into one.
        </div>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 600, lineHeight: 1, color: "var(--purple-dark)" }}>{scoreDigit(props.annualPerformanceScore)}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{isEmp && !archived ? "what you delivered" : "performance"}</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 600, lineHeight: 1, color: "var(--purple-dark)" }}>{scoreDigit(props.valuesScore)}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{isEmp && !archived ? "how you showed up" : "values"}{!props.valuesComplete ? " (pending)" : ""}</div>
          </div>
        </div>
      </Beat>

      {/* BEAT 3 — the employee's voice */}
      <Beat step="3" title={isEmp && !archived ? "Your reflection" : `${firstName}'s reflection`}>
        <Reflection
          prompt="Looking back on your year, what stands out?"
          hint="Think about what you're proud of, what stretched you, and where you'd like to grow."
          value={empSelf} set={setEmpSelf} editable={isEmp && !empLocked}
          placeholder="Take a moment to reflect…"
        />
      </Beat>

      {/* BEAT 4 — the manager's voice + growth + forward */}
      {showManagerSections ? (
        <>
          <Beat step="4" title="Manager's assessment">
            <Reflection
              prompt="How did this year go, in your words?"
              hint="Recognise the impact they had, and be honest about the whole picture."
              value={mgrAssess} set={setMgrAssess} editable={!isEmp && !mgrLocked}
              placeholder="Reflect on the year…"
            />
          </Beat>
          <Beat step="5" title="Areas for growth">
            <Reflection
              prompt="Where is the biggest opportunity to grow?"
              hint="One or two areas that would make the most difference next year. Optional."
              value={growth} set={setGrowth} editable={!isEmp && !mgrLocked}
              placeholder="Optional…"
            />
          </Beat>
          <Beat step="6" title="Where next">
            <Reflection
              prompt="What does next year look like?"
              hint="The goals and commitments you've agreed together for 2027."
              value={devPlan} set={setDevPlan} editable={!isEmp && !mgrLocked}
              placeholder="The plan you've agreed together…"
            />
          </Beat>
        </>
      ) : null}

      {/* ACTIONS */}
      <div style={{ marginTop: 8, paddingTop: 20, borderTop: "0.5px solid var(--border)", marginLeft: 46 }}>
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
              <button disabled={busy} onClick={() => handle(() => submitYearEndWithDraftAction(props.reviewId, empSelf), "Share with your manager.")}>Share with manager</button>
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