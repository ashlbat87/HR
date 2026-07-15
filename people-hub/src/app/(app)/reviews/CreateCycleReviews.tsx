"use client";

import { useState } from "react";
import { createCycleReviewsAction, createValuesCycleReviewsAction, createYearEndCycleReviewsAction } from "./actions";

export function CreateCycleReviews({ cycleId, label, type }: { cycleId: string; label: string; type: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isValues = type === "ANNUAL_VALUES";
  const isYearEnd = type === "YEAR_END";
  const kindLabel = isYearEnd ? "year-end" : isValues ? "annual values" : "quarterly";

  async function go() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = isYearEnd
      ? await createYearEndCycleReviewsAction(cycleId)
      : isValues
      ? await createValuesCycleReviewsAction(cycleId)
      : await createCycleReviewsAction(cycleId);
    setBusy(false);
    if ("error" in res) {
      setErr(res.error);
      return;
    }
    setMsg("Reviews created for " + label + ". Refresh to see them.");
  }

  return (
    <div className="card">
      <div><strong>HR:</strong> generate {kindLabel} reviews for the open cycle ({label}).</div>
      <div className="muted">Creates one review per active employee who has a manager. Safe to run again; existing reviews are skipped.</div>
      <div style={{ marginTop: 8 }}>
        <button onClick={go} disabled={busy}>{busy ? "Working…" : `Create ${kindLabel} reviews`}</button>
      </div>
      {msg ? <div className="chip status-completed" style={{ display: "block", marginTop: 8 }}>{msg}</div> : null}
      {err ? <div className="chip status-overdue" style={{ display: "block", marginTop: 8 }}>{err}</div> : null}
    </div>
  );
}
