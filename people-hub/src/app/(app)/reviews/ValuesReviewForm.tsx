"use client";

import { useState } from "react";
import { Lightbulb, Target, HeartHandshake, Users } from "lucide-react";
import { EmployeeRatingCard } from "@/modules/performance/RatingBadges";
import {
  saveEmployeeValuesDraftAction,
  saveManagerValuesDraftAction,
  submitValuesWithDraftAction,
  completeValuesWithDraftAction,
  returnToEmployeeAction,
  reopenReviewAction,
  closeReviewAction,
  acknowledgeReviewAction,
} from "./actions";

const VALUES = [
  "INNOVATE_WITH_IMPACT",
  "DRIVE_EXCEPTIONAL_RESULTS",
  "DELIVER_VALUE_TO_CUSTOMERS",
  "WIN_COLLECTIVELY",
] as const;
type ValueItem = (typeof VALUES)[number];

const LABELS: Record<ValueItem, string> = {
  INNOVATE_WITH_IMPACT: "Innovate with Impact",
  DRIVE_EXCEPTIONAL_RESULTS: "Drive Exceptional Results",
  DELIVER_VALUE_TO_CUSTOMERS: "Deliver Value to Customers",
  WIN_COLLECTIVELY: "Win Collectively",
};

const DEFINITIONS: Record<ValueItem, string> = {
  INNOVATE_WITH_IMPACT: "We embrace curiosity, challenge assumptions, ask bold questions, and pursue solutions that create real-world impact. Fueled by curiosity, rapid learning, and creativity, we continuously push boundaries.",
  DRIVE_EXCEPTIONAL_RESULTS: "We don't just move fast, we deliver exceptional results. Taking full ownership of outcomes, we work with precision, urgency, and accountability, ensuring every action contributes to high-impact execution.",
  DELIVER_VALUE_TO_CUSTOMERS: "We think like our customers and act like owners, taking full responsibility for delivering value. By deeply understanding their needs and proactively driving solutions, we create exceptional experiences that build lasting trust.",
  WIN_COLLECTIVELY: "Success is amplified when we work together. We embrace honesty, shared goals, and accountability to foster a culture of collaboration, inclusivity, and mutual support, where every voice matters and everyone thrives.",
};

const ICONS: Record<ValueItem, any> = {
  INNOVATE_WITH_IMPACT: Lightbulb,
  DRIVE_EXCEPTIONAL_RESULTS: Target,
  DELIVER_VALUE_TO_CUSTOMERS: HeartHandshake,
  WIN_COLLECTIVELY: Users,
};

const RATING_LABELS: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };

interface ExistingRating {
  item: string;
  score: number;
  comment: string | null;
}

interface Props {
  reviewId: string;
  mode: "employee" | "manager";
  status: string;
  employeeRatings: ExistingRating[];
  managerRatings: ExistingRating[];
  employeeReflection: string;
  valuesScore: number | null;
  canReopen: boolean;
  isEmployee: boolean;
  acknowledgedAt: string | null;
  anchors: Record<string, Record<number, string>>;
}

function ratingMap(rs: ExistingRating[]) {
  const m: Record<string, { score: number; comment: string }> = {};
  for (const r of rs) m[r.item] = { score: r.score, comment: r.comment ?? "" };
  return m;
}

export function ValuesReviewForm(props: Props) {
  const isEmployeeForm = props.mode === "employee";
  const initial = ratingMap(isEmployeeForm ? props.employeeRatings : props.managerRatings);
  const employeeMap = ratingMap(props.employeeRatings);
  const managerMap = ratingMap(props.managerRatings);
  const showManagerToEmployee = isEmployeeForm && ["COMPLETE", "CLOSED", "REOPENED"].includes(props.status);

  const [scores, setScores] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    for (const it of VALUES) s[it] = initial[it]?.score ?? 0;
    return s;
  });
  const [comments, setComments] = useState<Record<string, string>>(() => {
    const c: Record<string, string> = {};
    for (const it of VALUES) c[it] = initial[it]?.comment ?? "";
    return c;
  });
  const [reflection, setReflection] = useState(props.employeeReflection);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const employeeLocked = isEmployeeForm && !["NOT_STARTED", "IN_PROGRESS"].includes(props.status);
  const managerLocked = !isEmployeeForm && !["AWAITING_MANAGER", "REOPENED"].includes(props.status);
  const locked = isEmployeeForm ? employeeLocked : managerLocked;

  function buildRatings() {
    return VALUES.map((it) => ({ item: it as ValueItem, score: scores[it], comment: comments[it] || undefined }));
  }

  async function handle(fn: () => Promise<{ ok: true } | { error: string }>, successMsg: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fn();
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return false;
    }
    if (successMsg) setNotice(successMsg);
    return true;
  }

  async function saveDraft() {
    if (isEmployeeForm) {
      await handle(() => saveEmployeeValuesDraftAction(props.reviewId, buildRatings(), reflection), "Draft saved.");
    } else {
      await handle(() => saveManagerValuesDraftAction(props.reviewId, buildRatings()), "Draft saved.");
    }
  }

  async function submit() {
    await handle(() => submitValuesWithDraftAction(props.reviewId, buildRatings(), reflection), "Submitted to your manager.");
  }

  async function complete() {
    await handle(() => completeValuesWithDraftAction(props.reviewId, buildRatings()), "Review completed.");
  }

  return (
    <div>
      {error ? <div className="chip status-overdue" style={{ display: "block", marginBottom: 12 }}>{error}</div> : null}
      {notice ? <div className="chip status-completed" style={{ display: "block", marginBottom: 12 }}>{notice}</div> : null}

      {VALUES.map((it) => {
        const label = LABELS[it];
        const Icon = ICONS[it];
        const anchorSet = props.anchors[label] ?? {};
        const currentScore = scores[it];
        const shownAnchor = currentScore ? anchorSet[currentScore] : null;
        const empRating = employeeMap[it];
        const diff = !isEmployeeForm && empRating && currentScore && empRating.score !== currentScore;
        return (
          <div className="card" key={it} style={{ padding: "26px 28px", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--purple-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={22} color="var(--purple-dark)" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 3 }}>{label}</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{DEFINITIONS[it]}</div>
              </div>
            </div>

           {!isEmployeeForm && empRating ? (
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <EmployeeRatingCard score={empRating.score || null} size="sm" />
                {diff ? <span className="muted" style={{ fontSize: 12 }}>Different perspectives, worth discussing.</span> : null}
                {empRating.comment ? <div className="muted" style={{ fontSize: 13, width: "100%" }}>Employee comment: &ldquo;{empRating.comment}&rdquo;</div> : null}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, marginBottom: shownAnchor || (showManagerToEmployee && managerMap[it]) ? 16 : 12 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = currentScore === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={locked || busy}
                    onClick={() => setScores({ ...scores, [it]: n })}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: "14px 6px",
                      borderRadius: 14,
                      cursor: locked ? "default" : "pointer",
                      transition: "all 0.18s ease",
                      border: selected ? "1.5px solid var(--purple)" : "1px solid var(--border)",
                      background: selected ? "var(--purple-subtle)" : "#fff",
                      boxShadow: selected ? "0 4px 12px rgba(98,82,219,0.20)" : "none",
                      transform: selected ? "translateY(-2px)" : "none",
                      opacity: locked && !selected ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: 20, fontWeight: 700, color: selected ? "var(--purple-dark)" : "var(--text)" }}>{n}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: selected ? "var(--purple-dark)" : "var(--muted)", textAlign: "center", lineHeight: 1.2 }}>{RATING_LABELS[n]}</span>
                  </button>
                );
              })}
            </div>

            {shownAnchor ? (
              <div style={{ background: "var(--purple-subtle)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--purple-dark)" }}>{RATING_LABELS[currentScore]}: </span>
                <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65 }}>{shownAnchor}</span>
              </div>
            ) : null}

            {showManagerToEmployee && managerMap[it] ? (
              <div style={{ background: "#F7F8FA", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                  Manager rating: {managerMap[it].score ? `${managerMap[it].score} · ${RATING_LABELS[managerMap[it].score]}` : "—"}
                </div>
                {managerMap[it].comment ? <div className="muted" style={{ fontSize: 13 }}>{managerMap[it].comment}</div> : <div className="muted" style={{ fontSize: 13 }}>No comment.</div>}
              </div>
            ) : null}

            <input
              type="text"
              value={comments[it]}
              disabled={locked || busy}
              placeholder="Add a comment (optional)"
              onChange={(ev) => setComments({ ...comments, [it]: ev.target.value })}
              style={{ width: "100%" }}
            />
          </div>
        );
      })}

      {isEmployeeForm ? (
        <label className="field">
          <span>Overall reflection (optional)</span>
          <textarea value={reflection} disabled={locked || busy} onChange={(e) => setReflection(e.target.value)} rows={4} />
        </label>
      ) : null}

      {props.valuesScore !== null && ["COMPLETE", "CLOSED"].includes(props.status) ? (
        (() => {
          const emp = props.employeeRatings.filter((r) => r.score > 0);
          const selfAvg = emp.length ? emp.reduce((s, r) => s + r.score, 0) / emp.length : null;
          const diff = selfAvg !== null ? Math.abs(props.valuesScore! - selfAvg) : null;
          return (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 3, height: 15, background: "var(--purple)", borderRadius: 2 }} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>Overall values summary</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 24, fontWeight: 600 }}>{props.valuesScore!.toFixed(1)}</span>
                  <span className="muted" style={{ fontSize: 12 }}>Manager</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--purple-dark)", background: "var(--purple-subtle)", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Official</span>
                </div>
                <div style={{ width: 1, height: 28, background: "var(--border)" }} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 24, fontWeight: 600, color: "var(--muted)" }}>{selfAvg !== null ? selfAvg.toFixed(1) : "—"}</span>
                  <span className="muted" style={{ fontSize: 12 }}>Self-assessment</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", background: "var(--n20)", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>For comparison</span>
                </div>
                {diff !== null ? <div style={{ marginLeft: "auto", fontSize: 12 }} className="muted">Difference {diff.toFixed(1)}</div> : null}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                Manager rating is the official values score, from manager scores only, kept separate from performance. The two scores are never blended.
              </div>
            </div>
          );
        })()
      ) : null}

      {!locked ? (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={saveDraft} disabled={busy} className="btn secondary">Save draft</button>
          {isEmployeeForm ? (
            <button onClick={submit} disabled={busy}>Submit to manager</button>
          ) : (
            <>
              <button onClick={complete} disabled={busy}>Complete review</button>
              <button onClick={() => handle(() => returnToEmployeeAction(props.reviewId, "Returned for changes"), "Returned to employee.")} disabled={busy} className="btn secondary">Return to employee</button>
            </>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {props.canReopen && props.status === "COMPLETE" ? (
            <>
              <button onClick={() => handle(() => reopenReviewAction(props.reviewId, "Reopened to amend"), "Review reopened.")} disabled={busy} className="btn secondary">Reopen</button>
              <button onClick={() => handle(() => closeReviewAction(props.reviewId), "Review closed.")} disabled={busy}>Close review</button>
            </>
          ) : null}
          {props.isEmployee && props.status === "COMPLETE" ? (
            props.acknowledgedAt ? (
              <span className="chip status-completed">Acknowledged {new Date(props.acknowledgedAt).toLocaleDateString()}</span>
            ) : (
              <button onClick={() => handle(() => acknowledgeReviewAction(props.reviewId), "Acknowledged.")} disabled={busy}>Acknowledge I have seen this review</button>
            )
          ) : null}
          {!props.canReopen && !(props.isEmployee && props.status === "COMPLETE") ? (
            <p className="muted">This review is not currently editable in your role or its current state.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}