import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { GroupComparisonView } from "../GroupComparisonView";

export default async function ManagersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");
  return <GroupComparisonView dimension="PERFORMANCE" groupBy="manager" title="How do rating distributions vary by manager?" />;
}
