"use client";

import { useState } from "react";
import { previewAction, commitAction } from "./actions";

type Step = "upload" | "preview" | "done";

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

  const stepLabel = (s: Step, n: number, label: string) => (
    <span style={{ marginRight: 14, color: step === s ? "var(--burgundy)" : "var(--grey)", fontWeight: step === s ? 700 : 400 }}>
      ({n}) {label}
    </span>
  );

  return (
    <div>
      <div style={{ margin: "10px 0", fontSize: 13 }}>
        {stepLabel("upload", 1, "Upload")}
        {stepLabel("preview", 2, "Validate & preview")}
        {stepLabel("done", 3, "Done")}
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--burgundy)", color: "var(--burgundy)" }}>
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
            <div className="card" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
              This looks like production data (real @tarabut.com addresses). The
              prototype accepts fictional data only.
            </div>
          )}
          <p>
            <strong>{summary.counts.new}</strong> new,{" "}
            <strong>{summary.counts.update}</strong> updated,{" "}
            <strong>{summary.counts.unchanged}</strong> unchanged,{" "}
            <strong>{summary.counts.error}</strong> error(s),{" "}
            <strong>{summary.counts.warning}</strong> warning(s).
          </p>
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
                  <td>
                    <span className="chip">{r.flag}</span>
                  </td>
                  <td>{r.displayName || <span className="muted">—</span>}</td>
                  <td>{r.managerEmail ?? "—"}</td>
                  <td>{r.ratingGuideCategory ?? "—"}</td>
                  <td className="muted">{r.messages.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}>
            <button className="secondary" onClick={() => setStep("upload")}>
              Back
            </button>{" "}
            <button disabled={busy} onClick={runCommit}>
              {busy ? "Importing…" : "Confirm import"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="card">
          <h2>Import complete</h2>
          <p>
            {result.imported} imported, {result.updated} updated,{" "}
            {result.skipped} skipped (errors).
          </p>
          <p className="muted">This import was recorded in the audit log.</p>
          <a className="btn" href="/directory">
            View directory
          </a>
        </div>
      )}
    </div>
  );
}
