import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { DistributionView } from "../DistributionView";

export default async function PerformanceDistributionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");
  return <DistributionView dimension="PERFORMANCE" title="How are performance ratings distributed?" />;
}
