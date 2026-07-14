"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Result {
  id: string;
  displayName: string;
  workEmail: string;
  department: string | null;
}

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        setResults(await res.json());
        setOpen(true);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={box} style={{ position: "relative", width: "100%" }}>
      <input
        type="search"
        placeholder="Search people…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        style={{ width: "100%" }}
        aria-label="Global search"
      />
      {open && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 6,
            zIndex: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/directory/${r.id}`}
              onClick={() => setOpen(false)}
              style={{ display: "block", padding: "7px 10px", color: "var(--ink)" }}
            >
              {r.displayName}{" "}
              <span className="muted" style={{ fontSize: 12 }}>
                {r.department ?? r.workEmail}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
