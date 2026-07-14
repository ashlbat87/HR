// Global search. Available to HR and HR Admin from every screen.
// Scope is still enforced (HR/HR Admin see all employees). Searches name + email.
import { prisma } from "@/shared/lib/prisma";
import type { AuthUser } from "@/core/auth";
import { isHR } from "@/core/access";

export interface SearchResult {
  id: string;
  displayName: string;
  workEmail: string;
  department: string | null;
}

export async function globalSearch(
  user: AuthUser,
  query: string
): Promise<SearchResult[]> {
  // Global search is an HR/HR Admin capability per Stage 1 requirements.
  if (!isHR(user)) return [];
  const q = query.trim();
  if (q.length < 2) return [];
  return prisma.employee.findMany({
    where: {
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { workEmail: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, displayName: true, workEmail: true, department: true },
    take: 10,
    orderBy: { displayName: "asc" },
  });
}
