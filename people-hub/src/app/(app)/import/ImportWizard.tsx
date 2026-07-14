"use client";

import { useState } from "react";
import { previewAction, commitAction } from "./actions";

type Step = "upload" | "preview" | "done";

const FLAG_CLASS: Record<string, string> = {
  NEW: "status-completed",
  UPDATE: "status-inprogress",
  UNCHANGED: "status-outstanding",
  WARNING: "status-awaiting",
  ERROR: "status-overdue",
};

export function ImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    const text = await file.text();
    setCsvText(text);
    setError(null);
  }

  async function runPreview() {
    setBusy(true);
    setError(null);
    const res = await previewAction(csvText);
    setBusy(false);
    if ((res as any).error) return setError((res as any).error);
    setPreview((res as any).preview);
    setSummary({
      counts: (res as any).summary,
      productionWarning: (res as any).productionWarning,
    });
    setStep("preview");
  }

  async function runCommit() {
    setBusy(true);
    const res = await commitAction(csvText);
    setBusy(false);
    if ((res as any).error) return setError((res as any).error);
    setResult(res);
    setStep("done");
  }

  function StepDot({ s, n, label }: { s: Step; n: number; label: string }) {
    const order: Step[] = ["upload", "preview", "done"];
    const done = order.indexOf(step) > order.indexOf(s);
    const active = step === s;
    const bg = done ? "var(--success)" : active ? "var(--purple)" : "var(--n20)";
    const fg = done || active ? "#fff" : "var(--n60)";
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 6, color: active ? "var(--text)" : "var(--muted)", fontWeight: active ? 500 : 400 }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
          {done ? "✓" : n}
        </span>
        {label}
      </span>
    );
  }

  function CountTile({ n, label, bg, fg }: { n: number; label: string; bg: string; fg: string }) {
    return (
      <div style={{ flex: 1, background: bg, borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: fg }}>{n}</div>
        <div style={{ fontSize: 12, color: fg }}>{label}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 18px", fontSize: 13 }}>
        <StepDot s="upload" n={1} label="Upload" />
        <span style={{ width: 24, height: 1, background: "var(--n40)" }} />
        <StepDot s="preview" n={2} label="Validate & preview" />
        <span style={{ width: 24, height: 1, background: "var(--n40)" }} />
        <StepDot s="done" n={3} label="Done" />
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--danger-subtle)" }}>
          {error}
        </div>
      )}

      {step === "upload" && (
        <div className="card">
          <p>Choose a Zoho CSV file. Expected columns include: workEmail, displayName, department, managerEmail, employmentStatus, ratingGuideCategory.</p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <div style={{ marginTop: 12 }}>
            <button disabled={!csvText || busy} onClick={runPreview}>
              {busy ? "Validating…" : "Validate"}
            </button>
          </div>
        </div>
      )}

      {step === "preview" && preview && (
        <div>
          {summary?.productionWarning && (
            <div className="card" style={{ borderColor: "var(--warning)", color: "var(--warning)", background: "var(--warning-subtle)" }}>
              This looks like production data (real @tarabut.com addresses). The prototype accepts fictional data only.
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <CountTile n={summary.counts.new} label="New" bg="var(--success-subtle)" fg="var(--success)" />
            <CountTile n={summary.counts.update} label="Update" bg="var(--info-subtle)" fg="var(--info)" />
            <CountTile n={summary.counts.unchanged} label="Unchanged" bg="var(--n20)" fg="var(--n70)" />
            <CountTile n={summary.counts.warning} label="Warning" bg="var(--warning-subtle)" fg="var(--warning)" />
            <CountTile n={summary.counts.error} label="Error" bg="var(--danger-subtle)" fg="var(--danger)" />
          </div>
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Flag</th>
                <th>Name</th>
                <th>Manager</th>
                <th>Guide</th>
                <th>Messages</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r: any) => (
                <tr key={r.rowNumber}>
                  <td>{r.rowNumber}</td>
                  <td><span className={`chip ${FLAG_CLASS[r.flag] ?? ""}`}>{r.flag}</span></td>
                  <td>{r.displayName || <span className="muted">—</span>}</td>
                  <td className="muted">{r.managerEmail ?? "—"}</td>
                  <td className="muted">{r.ratingGuideCategory ?? "—"}</td>
                  <td className="muted">{r.messages.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}>
            <button className="secondary" onClick={() => setStep("upload")}>Back</button>{" "}
            <button disabled={busy} onClick={runCommit}>
              {busy ? "Importing…" : "Confirm import"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="card">
          <h2>Import complete</h2>
          <p>{result.imported} imported, {result.updated} updated, {result.skipped} skipped (errors).</p>
          <p className="muted">This import was recorded in the audit log.</p>
          <a className="btn" href="/directory">View directory</a>
        </div>
      )}
    </div>
  );
}
