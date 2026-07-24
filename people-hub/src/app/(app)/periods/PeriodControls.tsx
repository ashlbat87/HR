"use client";

import { useState } from "react";
import {
  createReviewPeriodAction,
  setCurrentPeriodAction,
  openCycleInPeriodAction,
  completeReviewPeriodAction,
} from "./actions";

const TYPE_LABEL: Record<string, string> = {
  QUARTERLY: "Quarterly",
  ANNUAL_VALUES: "Annual values",
  YEAR_END: "Year-end",
};

export function StartPeriod() {
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    if (!label.trim()) { setErr("Enter a name for the period."); return; }
    setBusy(true); setErr(null);
    const res = await createReviewPeriodAction(label.trim());
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    setLabel("");
  }

  return (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Start a new review period</div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
        Usually a year (e.g. 2027). It becomes current only if there is no current period; otherwise set it current explicitly.
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          value={label}
          placeholder="e.g. 2027"
          disabled={busy}
          onChange={(e) => setLabel(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <button onClick={go} disabled={busy}>{busy ? "Working…" : "Create period"}</button>
      </div>
      {err ? <div className="chip status-overdue" style={{ display: "block", marginTop: 8 }}>{err}</div> : null}
    </div>
  );
}

export function SetCurrent({ periodId, label }: { periodId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true); setErr(null);
    const res = await setCurrentPeriodAction(periodId);
    setBusy(false);
    if ("error" in res) setErr(res.error);
  }
  return (
    <>
      <button className="btn secondary" onClick={go} disabled={busy}>{busy ? "Working…" : "Make current"}</button>
      {err ? <span className="chip status-overdue" style={{ marginLeft: 8 }}>{err}</span> : null}
    </>
  );
}

export function OpenCycle({ periodId }: { periodId: string }) {
  const [type, setType] = useState("QUARTERLY");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    if (!label.trim()) { setErr("Enter a label for the cycle."); return; }
    setBusy(true); setErr(null); setMsg(null);
    const res = await openCycleInPeriodAction(periodId, type as any, label.trim());
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    setMsg("Opened " + TYPE_LABEL[type] + " cycle: " + label.trim());
    setLabel("");
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Open a cycle in this period</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={type} disabled={busy} onChange={(e) => setType(e.target.value)}>
          <option value="QUARTERLY">Quarterly</option>
          <option value="ANNUAL_VALUES">Annual values</option>
          <option value="YEAR_END">Year-end</option>
        </select>
        <input
          type="text"
          value={label}
          placeholder="e.g. Q1 2027"
          disabled={busy}
          onChange={(e) => setLabel(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <button onClick={go} disabled={busy}>{busy ? "Working…" : "Open cycle"}</button>
      </div>
      {msg ? <div className="chip status-completed" style={{ display: "block", marginTop: 8 }}>{msg}</div> : null}
      {err ? <div className="chip status-overdue" style={{ display: "block", marginTop: 8 }}>{err}</div> : null}
    </div>
  );
}

export function CompletePeriod({ periodId, label }: { periodId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [outstanding, setOutstanding] = useState<{ reviewId: string; type: string; status: string }[] | null>(null);

  async function go() {
    setBusy(true); setErr(null); setOutstanding(null);
    const res = await completeReviewPeriodAction(periodId);
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    if ("blocked" in res) { setOutstanding(res.outstanding.map((o) => ({ reviewId: o.reviewId, type: o.type, status: o.status }))); return; }
    // success revalidates the page
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
      <button className="btn secondary" onClick={go} disabled={busy}>{busy ? "Checking…" : "Complete period"}</button>
      {err ? <div className="chip status-overdue" style={{ display: "block", marginTop: 8 }}>{err}</div> : null}
      {outstanding ? (
        (() => {
          const groups: Record<string, number> = {};
          for (const o of outstanding) {
            const key = (TYPE_LABEL[o.type] ?? o.type) + " · " + o.status.toLowerCase().replace(/_/g, " ");
            groups[key] = (groups[key] ?? 0) + 1;
          }
          const summary = Object.entries(groups).map(([k, n]) => n + " " + k).join(", ");
          return (
            <div className="card" style={{ marginTop: 10, background: "var(--purple-subtle)", border: "none" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Cannot complete {label} yet: {outstanding.length} review{outstanding.length === 1 ? "" : "s"} still open.
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Every review in the period must be complete or archived first. Outstanding: {summary}.
              </div>
            </div>
          );
        })()
      ) : null}
    </div>
  );
}