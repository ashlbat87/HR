"use client";

import { useState } from "react";
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
  // anchors[valueItem][score] = anchor text; keyed by the value LABEL as stored in the guide.
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
        const anchorSet = props.anchors[label] ?? {};
        const currentScore = scores[it];
        const shownAnchor = currentScore ? anchorSet[currentScore] : null;
        const empRating = employeeMap[it];
        const diff = !isEmployeeForm && empRating && currentScore && empRating.score !== currentScore;
        return (
          <div className="card" key={it}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
            {!isEmployeeForm && empRating ? (
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                Employee self-score: <strong>{empRating.score || "—"}</strong>
                {empRating.comment ? ` · "${empRating.comment}"` : ""}
                {diff ? <span className="chip status-awaiting" style={{ marginLeft: 8 }}>Differs from yours</span> : null}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = currentScore === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={locked || busy}
                    onClick={() => setScores({ ...scores, [it]: n })}
                    className={selected ? "" : "secondary"}
                    style={{
                      flex: 1,
                      ...(selected
                        ? { background: "var(--purple)", color: "#fff", opacity: 1, borderColor: "var(--purple)" }
                        : {}),
                      ...(locked && !selected ? { opacity: 0.55 } : {}),
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {shownAnchor ? <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{shownAnchor}</div> : null}
            <input
              type="text"
              value={comments[it]}
              disabled={locked || busy}
              placeholder="Comment (optional)"
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

      {props.valuesScore !== null ? (
        <p className="muted">Overall values rating: <strong>{props.valuesScore.toFixed(1)}</strong> <span style={{ fontSize: 12 }}>(from manager scores; kept separate from performance)</span></p>
      ) : null}

      {!locked ? (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={saveDraft} disabled={busy} className="btn secondary">Save draft</button>
          {isEmployeeForm ? (
            <button onClick={submit} disabled={busy}>Submit to manager</button>
          ) : (
            <>
              <button onClick={complete} disabled={busy}>Complete review</button>
              <button
                onClick={() => handle(() => returnToEmployeeAction(props.reviewId, "Returned for changes"), "Returned to employee.")}
                disabled={busy}
                className="btn secondary"
              >
                Return to employee
              </button>
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
              <button onClick={() => handle(() => acknowledgeReviewAction(props.reviewId), "Acknowledged.")} disabled={busy}>
                Acknowledge I have seen this review
              </button>
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
