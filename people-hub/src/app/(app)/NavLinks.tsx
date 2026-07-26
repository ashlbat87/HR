"use client";
// Client nav links with active-page highlighting. Uses usePathname() to apply the existing
// `.nav a.active` style to the current section. Section match is "starts with" so sub-pages
// (e.g. /reporting/performance) keep the parent (/reporting) highlighted.

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ manager, hr, hrAdmin, notifs }: { manager: boolean; hr: boolean; hrAdmin: boolean; notifs: number }) {
  const pathname = usePathname() || "";
  // Routes whose detail pages are shared across sections match EXACTLY, so opening an
  // individual review (reached from My Reviews, Browse, or Reporting) does not mislabel the
  // nav. Section routes use "starts with" so their own sub-pages keep the parent highlighted.
  const EXACT_ONLY = new Set(["/reviews"]);
  const isActive = (href: string) =>
    EXACT_ONLY.has(href) ? pathname === href : (pathname === href || pathname.startsWith(href + "/"));
  const cls = (href: string, extra = "") => {
    const active = isActive(href) ? "active" : "";
    return [active, extra].filter(Boolean).join(" ") || undefined;
  };

  return (
    <>
      <Link href="/reviews" className={cls("/reviews")}>My Reviews</Link>
      {manager && <Link href="/team" className={cls("/team")}>My Team</Link>}
      {hr && <Link href="/dashboard" className={cls("/dashboard")}>HR Dashboard</Link>}
      {hr && <Link href="/reviews-browse" className={cls("/reviews-browse")}>Browse reviews</Link>}
      {hr && <Link href="/periods" className={cls("/periods")}>Review periods</Link>}
      {hr && <Link href="/reporting" className={cls("/reporting")}>Reporting &amp; Insights</Link>}
      {hr && <Link href="/directory" className={cls("/directory")}>Employee Directory</Link>}
      <Link
        href="/notifications"
        className={cls("/notifications", notifs > 0 ? "badge" : "")}
        data-count={notifs > 0 ? String(notifs) : ""}
      >
        Notifications
      </Link>
      {hrAdmin && <Link href="/import" className={cls("/import")}>Employee Import</Link>}
    </>
  );
}
