// Mock authentication provider (Stage 1 only).
//
// Simulates a signed-in session using a simple cookie holding the user's email.
// No passwords. This exists purely so the real app behaviour (permissions,
// role-based nav, per-role screens) can be exercised before Entra is wired up.
//
// A "sign in as" picker (see /signin) lets you experience the app as an employee,
// a manager, HR, or an HR admin — which is exactly the Stage 1 testing need.

import { cookies } from "next/headers";
import type { AuthProvider, AuthUser } from "./index";
import type { Role } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";

const COOKIE = "ph_mock_user";

export class MockAuthProvider implements AuthProvider {
  async getCurrentUser(): Promise<AuthUser | null> {
    const cookieStore = await cookies();
    const email = cookieStore.get(COOKIE)?.value;
    if (!email) return null;

    const employee = await prisma.employee.findUnique({
      where: { workEmail: email },
      include: { roleAssignments: true },
    });
    if (!employee) return null;

    // A person is at least an EMPLOYEE. If they have reports, they are a MANAGER.
    const roles = new Set<Role>(
      employee.roleAssignments.map((r: { role: Role }) => r.role)
    );
    roles.add("EMPLOYEE");
    const reportCount = await prisma.employee.count({
      where: { managerId: employee.id },
    });
    if (reportCount > 0) roles.add("MANAGER");

    return {
      employeeId: employee.id,
      email: employee.workEmail,
      displayName: employee.displayName,
      roles: Array.from(roles),
    };
  }

  async signIn(email: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE, email, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  async signOut(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE);
  }
}
