// Authenticated app shell: top bar (brand, cycle, global search for HR, user menu)
// and a role-aware left nav. Nav items the role lacks permission for are NOT
// rendered — and the routes themselves are also guarded server-side.

import { getCurrentUser } from "@/core/auth";
import { isHR, isHRAdmin, isManager } from "@/core/access";
import { unreadCount } from "@/core/notifications";
import { getAuthProvider } from "@/core/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/shared/lib/prisma";
import { GlobalSearch } from "@/shared/components/GlobalSearch";

async function signOutAction() {
  "use server";
  await getAuthProvider().signOut();
  redirect("/signin");
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const hr = isHR(user);
  const hrAdmin = isHRAdmin(user);
  const manager = isManager(user);
  const notifs = await unreadCount(user.employeeId);

  const cycle = await prisma.reviewCycle.findFirst({
    where: { isOpen: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="topbar">
        <span className="brand">Tarabut People Hub</span>
        {hr && (
          <div className="searchbar">
            <GlobalSearch />
          </div>
        )}
        <span className="cycle">
          {cycle ? `Cycle: ${cycle.label}` : "No open cycle"}
        </span>
        <span>
          {user.displayName}
          <span className="role-badge">
            {hrAdmin ? "HR ADMIN" : hr ? "HR" : manager ? "MANAGER" : "EMPLOYEE"}
          </span>
          <form action={signOutAction} style={{ display: "inline", marginLeft: 10 }}>
            <button className="secondary" style={{ padding: "3px 10px" }}>
              Sign out
            </button>
          </form>
        </span>
      </div>

      <div className="layout">
        <nav className="nav">
          <Link href="/reviews">My Reviews</Link>
          {manager && <Link href="/team">My Team</Link>}
          {hr && <Link href="/reviews-admin">Review admin</Link>}
          {hr && <Link href="/dashboard">HR Dashboard</Link>}
          {hr && <Link href="/directory">Employee Directory</Link>}
          <Link
            href="/notifications"
            className={notifs > 0 ? "badge" : ""}
            data-count={notifs > 0 ? String(notifs) : ""}
          >
            Notifications
          </Link>
          {hrAdmin && <Link href="/import">Employee Import</Link>}
          {/* Reports, Cycles, Guides, Admin appear in later stages */}
        </nav>
        <main className="content">{children}</main>
      </div>
    </>
  );
}
