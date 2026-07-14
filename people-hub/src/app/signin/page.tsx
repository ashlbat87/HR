// Sign-in (mock provider). In Stage 1 this lets you sign in as any seeded
// fictional user, so you can experience the app as employee / manager / HR /
// HR admin. Real Entra ID replaces this page's action later; the rest of the
// app is unaffected because it depends only on the auth seam.

import { prisma } from "@/shared/lib/prisma";
import { getAuthProvider } from "@/core/auth";
import { redirect } from "next/navigation";

async function signInAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email"));
  await getAuthProvider().signIn(email);
  redirect("/");
}

export default async function SignInPage() {
  const people = await prisma.employee.findMany({
    include: { roleAssignments: true, reports: { select: { id: true } } },
    orderBy: { displayName: "asc" },
  });

  const describe = (p: (typeof people)[number]) => {
    const roles = new Set(
      p.roleAssignments.map((r: { role: string }) => r.role as string)
    );
    roles.add("EMPLOYEE");
    if (p.reports.length > 0) roles.add("MANAGER");
    const order = ["HR_ADMIN", "HR", "MANAGER", "EMPLOYEE"];
    const top = order.find((r) => roles.has(r)) ?? "EMPLOYEE";
    return top.replace("_", " ");
  };

  return (
    <main style={{ maxWidth: 440, margin: "60px auto", padding: "0 16px" }}>
      <h1>Tarabut People Hub</h1>
      <p className="muted">
        Prototype sign-in. Choose a fictional user to explore the app in their
        role. (Real Microsoft 365 sign-in replaces this later.)
      </p>
      <div className="card">
        {people.map((p) => (
          <form key={p.id} action={signInAction} style={{ marginBottom: 8 }}>
            <input type="hidden" name="email" value={p.workEmail} />
            <button className="secondary" style={{ width: "100%", textAlign: "left" }}>
              {p.displayName}{" "}
              <span className="role-badge">{describe(p)}</span>
              <span className="muted" style={{ float: "right", fontSize: 12 }}>
                {p.department ?? ""}
              </span>
            </button>
          </form>
        ))}
        {people.length === 0 && (
          <p className="empty">
            No employees yet. Run the seed script, then refresh.
          </p>
        )}
      </div>
    </main>
  );
}
