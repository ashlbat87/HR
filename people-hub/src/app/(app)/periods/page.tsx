// Review period management — HR only. Define review periods, set the current one,
// open cycles of each type within a period, and complete a period (which archives it).
import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import { StartPeriod, SetCurrent, OpenCycle, CompletePeriod } from "./PeriodControls";

const TYPE_LABEL: Record<string, string> = {
  QUARTERLY: "Quarterly",
  ANNUAL_VALUES: "Annual values",
  YEAR_END: "Year-end",
};

export default async function PeriodsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");

  const periods = await prisma.reviewPeriod.findMany({
    orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
    include: {
      cycles: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { reviews: true } } },
      },
    },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>Review periods</h1>
      </div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 24, marginLeft: 13 }}>
        Define review periods, open the cycles within each, and complete a period once all its reviews are done.
      </p>

      <StartPeriod />

      <h3 style={{ fontSize: 15, marginTop: 28 }}>All periods</h3>
      {periods.length === 0 ? (
        <div className="empty">No review periods yet. Start one above.</div>
      ) : (
        periods.map((p) => {
          const completed = p.status === "COMPLETED";
          return (
            <div key={p.id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{p.label}</div>
                {p.isCurrent ? <span className="chip status-completed">Current</span> : null}
                {completed ? <span className="chip status-awaiting">Completed{p.closedAt ? " · " + new Date(p.closedAt).toLocaleDateString() : ""}</span> : null}
                {!p.isCurrent && !completed ? (
                  <span style={{ marginLeft: "auto" }}><SetCurrent periodId={p.id} label={p.label} /></span>
                ) : null}
              </div>

              {p.cycles.length === 0 ? (
                <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>No cycles opened in this period yet.</div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  {p.cycles.map((c) => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "4px 0" }}>
                      <span style={{ fontWeight: 600, minWidth: 110 }}>{TYPE_LABEL[c.type] ?? c.type}</span>
                      <span className="muted">{c.label}</span>
                      <span className="muted">· {c._count.reviews} review{c._count.reviews === 1 ? "" : "s"}</span>
                      {c.isOpen ? <span className="chip status-completed">Open</span> : <span className="chip">Closed</span>}
                    </div>
                  ))}
                </div>
              )}

              {!completed ? (
                <>
                  <OpenCycle periodId={p.id} />
                  <CompletePeriod periodId={p.id} label={p.label} />
                </>
              ) : (
                <div className="muted" style={{ fontSize: 12, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  This period is completed and read-only.
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}