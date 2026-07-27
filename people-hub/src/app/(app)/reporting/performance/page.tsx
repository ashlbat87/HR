import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { DistributionView } from "../DistributionView";

export default async function PerformanceDistributionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");
  const sp = await searchParams;
  return <DistributionView dimension="PERFORMANCE" title="How are performance ratings distributed?" params={{ cycle: sp.cycle, scope: sp.scope, period: sp.period }} />;
}
