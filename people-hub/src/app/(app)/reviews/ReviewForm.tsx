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
      {error ? <div className="chip" style={{ background: "#f8d7da", color: "#842029", display: "block", marginBottom: 12 }}>{error}</div> : null}
      {notice ? <div className="chip" style={{ background: "#d1e7dd", color: "#0f5132", display: "block", marginBottom: 12 }}>{notice}</div> : null}

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Score (1 to 5)</th>
            <th>Comment</th>
          </tr>
        </thead>
        <tbody>
          {ITEMS.map((it) => (
            <tr key={it}>
              <td><strong>{it.charAt(0) + it.slice(1).toLowerCase()}</strong></td>
              <td>
                <select
                  value={scores[it]}
                  disabled={locked || busy}
                  onChange={(ev) => setScores({ ...scores, [it]: Number(ev.target.value) })}
                >
                  <option value={0}>—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="text"
                  value={comments[it]}
                  disabled={locked || busy}
                  placeholder="Optional"
                  onChange={(ev) => setComments({ ...comments, [it]: ev.target.value })}
                  style={{ width: "100%" }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
