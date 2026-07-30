import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { CriterionAnalysisView } from "../CriterionAnalysisView";

export default async function CriterionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");
  const sp = await searchParams;
  return <CriterionAnalysisView params={{ cycle: sp.cycle, scope: sp.scope, period: sp.period }} />;
}
