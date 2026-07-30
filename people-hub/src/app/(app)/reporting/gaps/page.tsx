import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { GapAnalysisView } from "../GapAnalysisView";

export default async function GapsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");
  const sp = await searchParams;
  return <GapAnalysisView params={{ cycle: sp.cycle, scope: sp.scope, period: sp.period }} />;
}
