"use client";

import { useState } from "react";
import {
  saveEmployeeDraftAction,
  submitReviewAction,
  submitWithDraftAction,
  completeWithDraftAction,
  saveManagerDraftAction,
  managerCompleteAction,
  returnToEmployeeAction,
  reopenReviewAction,
  closeReviewAction,
} from "./actions";

const ITEMS = ["IMPACT", "QUALITY", "DELIVERY"] as const;
type Item = (typeof ITEMS)[number];

const LABELS: Record<Item, string> = {
  IMPACT: "Impact",
  QUALITY: "Quality",
  DELIVERY: "Delivery Reliability",
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
  okrContribution: string;
  developmentAction: string;
  employeeReflection: string;
  quarterlyScore: number | null;
  canReopen: boolean;
}

function ratingMap(rs: ExistingRating[]) {
  const m: Record<string, { score: number; comment: string }> = {};
  for (const r of rs) m[r.item] = { score: r.score, comment: r.comment ?? "" };
  return m;
}

export function ReviewForm(props: Props) {
  const isEmployee = props.mode === "employee";
  const initial = ratingMap(isEmployee ? props.employeeRatings : props.managerRatings);
  const employeeMap = ratingMap(props.employeeRatings);
  const managerMap = ratingMap(props.managerRatings);
  const showManagerToEmployee = isEmployee && ["COMPLETE", "CLOSED"].includes(props.status);

  const [scores, setScores] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    for (const it of ITEMS) s[it] = initial[it]?.score ?? 0;
    return s;
  });
  const [comments, setComments] = useState<Record<string, string>>(() => {
    const c: Record<string, string> = {};
    for (const it of ITEMS) c[it] = initial[it]?.comment ?? "";
    return c;
  });
  const [okr, setOkr] = useState(props.okrContribution);
  const [dev, setDev] = useState(props.developmentAction);
  const [reflection, setReflection] = useState(props.employeeReflection);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const employeeLocked = isEmployee && !["NOT_STARTED", "IN_PROGRESS"].includes(props.status);
  const managerLocked = !isEmployee && !["AWAITING_MANAGER", "REOPENED"].includes(props.status);
  const locked = isEmployee ? employeeLocked : managerLocked;

  function buildRatings() {
    return ITEMS.map((it) => ({ item: it as Item, score: scores[it], comment: comments[it] || undefined }));
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
    setNotice(successMsg);
    return true;
  }

  async function saveDraft() {
    if (isEmployee) {
      await handle(
        () =>
          saveEmployeeDraftAction(props.reviewId, buildRatings(), {
            okrContribution: okr,
            developmentAction: dev,
            employeeReflection: reflection,
          }),
        "Draft saved."
      );
    } else {
      await handle(() => saveManagerDraftAction(props.reviewId, buildRatings(), dev), "Draft saved.");
    }
  }

  async function submit() {
    await handle(
      () =>
        submitWithDraftAction(props.reviewId, buildRatings(), {
          okrContribution: okr,
          developmentAction: dev,
          employeeReflection: reflection,
        }),
      "Submitted to your manager."
    );
  }

  async function complete() {
    await handle(() => completeWithDraftAction(props.reviewId, buildRatings(), dev), "Review completed.");
  }

  return (
    <div>
      {error ? <div className="chip status-overdue" style={{ display: "block", marginBottom: 12 }}>{error}</div> : null}
      {notice ? <div className="chip status-completed" style={{ display: "block", marginBottom: 12 }}>{notice}</div> : null}

      {ITEMS.map((it) => {
        const currentScore = scores[it];
        const empRating = employeeMap[it];
        const diff = !isEmployee && empRating && currentScore && empRating.score !== currentScore;
        return (
          <div className="card" key={it}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{LABELS[it]}</div>
            {!isEmployee && empRating ? (
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
                      ...(selected ? { background: "var(--purple)", color: "#fff", opacity: 1, borderColor: "var(--purple)" } : {}),
                      ...(locked && !selected ? { opacity: 0.55 } : {}),
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {showManagerToEmployee && managerMap[it] ? (
              <div className="card" style={{ background: "var(--purple-subtle)", border: "none", marginBottom: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--purple-dark)", marginBottom: 2 }}>
                  Manager rating: {managerMap[it].score || "—"}
                </div>
                {managerMap[it].comment ? (
                  <div className="muted" style={{ fontSize: 13 }}>{managerMap[it].comment}</div>
                ) : (
                  <div className="muted" style={{ fontSize: 13 }}>No comment.</div>
                )}
              </div>
            ) : null}
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

      {isEmployee ? (
        <>
          <label className="field">
            <span>OKR contribution</span>
            <textarea value={okr} disabled={locked || busy} onChange={(e) => setOkr(e.target.value)} rows={3} />
          </label>
          <label className="field">
            <span>Development action</span>
            <textarea value={dev} disabled={locked || busy} onChange={(e) => setDev(e.target.value)} rows={2} />
          </label>
          <label className="field">
            <span>Your reflection</span>
            <textarea value={reflection} disabled={locked || busy} onChange={(e) => setReflection(e.target.value)} rows={4} />
          </label>
        </>
      ) : (
        <label className="field">
          <span>Development action (agreed)</span>
          <textarea value={dev} disabled={locked || busy} onChange={(e) => setDev(e.target.value)} rows={2} />
        </label>
      )}

      {showManagerToEmployee && props.developmentAction ? (
        <div className="card" style={{ background: "var(--purple-subtle)", border: "none" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--purple-dark)", marginBottom: 2 }}>Development action (agreed)</div>
          <div className="muted" style={{ fontSize: 13 }}>{props.developmentAction}</div>
        </div>
      ) : null}

      {props.quarterlyScore !== null ? (
        <p className="muted">Quarterly score: <strong>{props.quarterlyScore.toFixed(1)}</strong></p>
      ) : null}

      {!locked ? (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={saveDraft} disabled={busy} className="btn secondary">Save draft</button>
          {isEmployee ? (
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
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {props.canReopen && props.status === "COMPLETE" ? (
            <>
              <button
                onClick={() => handle(() => reopenReviewAction(props.reviewId, "Reopened to amend"), "Review reopened.")}
                disabled={busy}
                className="btn secondary"
              >
                Reopen
              </button>
              <button
                onClick={() => handle(() => closeReviewAction(props.reviewId), "Review closed.")}
                disabled={busy}
              >
                Close review
              </button>
            </>
          ) : (
            <p className="muted">This review is not currently editable in your role or its current state.</p>
          )}
        </div>
      )}
    </div>
  );
}