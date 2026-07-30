import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { GroupComparisonView } from "../GroupComparisonView";

export default async function DepartmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");
  const sp = await searchParams;
  return <GroupComparisonView dimension="PERFORMANCE" groupBy="department" title="Which departments differ from the organisation?" params={{ cycle: sp.cycle, scope: sp.scope, period: sp.period }} />;
}
