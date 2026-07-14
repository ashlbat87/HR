"use client";

import { useState } from "react";
import { createCycleReviewsAction } from "./actions";

export function CreateCycleReviews({ cycleId, label }: { cycleId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await createCycleReviewsAction(cycleId);
    setBusy(false);
    if ("error" in res) {
      setErr(res.error);
      return;
    }
    setMsg("Reviews created for " + label + ". Refresh to see them.");
  }

  return (
    <div className="card">
      <div><strong>HR:</strong> generate quarterly reviews for the open cycle ({label}).</div>
      <div className="muted">Creates one review per active employee who has a manager. Safe to run again; existing reviews are skipped.</div>
      <div style={{ marginTop: 8 }}>
        <button onClick={go} disabled={busy}>{busy ? "Working…" : "Create quarterly reviews"}</button>
      </div>
      {msg ? <div className="chip" style={{ background: "#d1e7dd", color: "#0f5132", display: "block", marginTop: 8 }}>{msg}</div> : null}
      {err ? <div className="chip" style={{ background: "#f8d7da", color: "#842029", display: "block", marginTop: 8 }}>{err}</div> : null}
    </div>
  );
}
