// Access control — server-side permission rules.
//
// PRD rule: permissions are enforced on the server, never by hiding a menu item.
// Every screen/data function calls these helpers. A user who forges a URL to a
// route they lack permission for is refused here, not merely shown a blank page.

import type { AuthUser } from "@/core/auth";
import type { Role } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";

export function hasRole(user: AuthUser, role: Role): boolean {
  return user.roles.includes(role);
}

export function isHR(user: AuthUser): boolean {
  return hasRole(user, "HR") || hasRole(user, "HR_ADMIN");
}

export function isHRAdmin(user: AuthUser): boolean {
  return hasRole(user, "HR_ADMIN");
}

export function isManager(user: AuthUser): boolean {
  return hasRole(user, "MANAGER");
}

/** Can `user` view the employee record `targetId`? */
export async function canViewEmployee(
  user: AuthUser,
  targetId: string
): Promise<boolean> {
  if (targetId === user.employeeId) return true; // own profile
  if (isHR(user)) return true; // HR sees all
  if (isManager(user)) {
    // Managers see only their DIRECT reports (Phase 1: no skip-level).
    const target = await prisma.employee.findUnique({
      where: { id: targetId },
      select: { managerId: true },
    });
    return target?.managerId === user.employeeId;
  }
  return false;
}

/** The set of employee ids `user` is permitted to see in lists. */
export async function visibleEmployeeScope(
  user: AuthUser
): Promise<{ all: boolean; ids?: string[] }> {
  if (isHR(user)) return { all: true };
  if (isManager(user)) {
    const reports = await prisma.employee.findMany({
      where: { managerId: user.employeeId },
      select: { id: true },
    });
    return { all: false, ids: [user.employeeId, ...reports.map((r) => r.id)] };
  }
  // Plain employee: only themselves.
  return { all: false, ids: [user.employeeId] };
}

/** Route-level guard. Throws if not permitted (caller converts to redirect/404). */
export class AccessDenied extends Error {
  constructor(msg = "Access denied") {
    super(msg);
    this.name = "AccessDenied";
  }
}

export function requireHR(user: AuthUser | null): AuthUser {
  if (!user || !isHR(user)) throw new AccessDenied("HR access required");
  return user;
}

export function requireHRAdmin(user: AuthUser | null): AuthUser {
  if (!user || !isHRAdmin(user)) throw new AccessDenied("HR Admin access required");
  return user;
}

export function requireSignedIn(user: AuthUser | null): AuthUser {
  if (!user) throw new AccessDenied("Sign-in required");
  return user;
}
