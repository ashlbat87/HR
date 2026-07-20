"use client";

// Tarabut Design System — Rating identity components.
// Distinguishes Employee self-ratings (reflective, outlined) from Manager ratings
// (official, solid), never by colour alone: each uses a distinct icon, badge,
// border/fill, and typography. These are DISPLAY components for showing a rating's
// origin and value; they are not the interactive scoring controls. No business logic.

import { User, ShieldCheck } from "lucide-react";

const RATING_LABELS: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };

function labelFor(score: number | null | undefined, explicit?: string) {
  if (explicit) return explicit;
  if (score && RATING_LABELS[score]) return RATING_LABELS[score];
  return "—";
}

// Employee self-rating: reflective. White background, purple outline, purple text,
// person icon, "Self" badge.
export function EmployeeRatingCard({
  score,
  label,
  comment,
  size = "md",
}: {
  score?: number | null;
  label?: string;
  comment?: string | null;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "8px 12px" : "12px 16px";
  const num = size === "sm" ? 16 : 20;
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 4,
        minWidth: size === "sm" ? 96 : 120,
        padding: pad,
        borderRadius: 12,
        background: "#fff",
        border: "1.5px solid var(--purple)",
        color: "var(--purple-dark)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <User size={13} color="var(--purple-dark)" strokeWidth={2.2} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--purple-dark)" }}>Employee review</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        {score ? <span style={{ fontSize: num, fontWeight: 700, color: "var(--purple-dark)" }}>{score}</span> : null}
        <span style={{ fontSize: size === "sm" ? 12 : 13, fontWeight: 600, color: "var(--purple-dark)" }}>{labelFor(score, label)}</span>
      </div>
      {comment ? (
        <div style={{ fontSize: 13, color: "var(--purple-dark)", marginTop: 6, lineHeight: 1.5, opacity: 0.85 }}>{comment}</div>
      ) : null}
    </div>
  );
}

// Manager rating: official. Solid purple, white text, elevation, shield-check icon,
// "Manager" badge.
export function ManagerRatingCard({
  score,
  label,
  comment,
  size = "md",
}: {
  score?: number | null;
  label?: string;
  comment?: string | null;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "8px 12px" : "12px 16px";
  const num = size === "sm" ? 16 : 20;
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 4,
        minWidth: size === "sm" ? 96 : 120,
        maxWidth: comment ? "100%" : undefined,
        padding: pad,
        borderRadius: 12,
        background: "var(--purple)",
        border: "1.5px solid var(--purple)",
        color: "#fff",
        boxShadow: "0 4px 12px rgba(98,82,219,0.22)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <ShieldCheck size={13} color="#fff" strokeWidth={2.2} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#fff" }}>Manager</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        {score ? <span style={{ fontSize: num, fontWeight: 700, color: "#fff" }}>{score}</span> : null}
        <span style={{ fontSize: size === "sm" ? 12 : 13, fontWeight: 600, color: "#fff" }}>{labelFor(score, label)}</span>
      </div>
      {comment ? (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 6, lineHeight: 1.5 }}>{comment}</div>
      ) : null}
    </div>
  );
}

// Comparison: both ratings side by side, with a neutral difference indicator that
// encourages discussion rather than implying either is correct.
export function RatingComparison({
  employeeScore,
  managerScore,
  size = "md",
}: {
  employeeScore?: number | null;
  managerScore?: number | null;
  size?: "sm" | "md";
}) {
  const differ = employeeScore && managerScore && employeeScore !== managerScore;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <EmployeeRatingCard score={employeeScore} size={size} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 60 }}>
        <div style={{ width: 24, height: 1, background: "var(--border)" }} />
        {differ ? (
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textAlign: "center", lineHeight: 1.2 }}>Different<br />perspectives</span>
        ) : employeeScore && managerScore ? (
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)" }}>Aligned</span>
        ) : null}
        <div style={{ width: 24, height: 1, background: "var(--border)" }} />
      </div>
      <ManagerRatingCard score={managerScore} size={size} />
    </div>
  );
}