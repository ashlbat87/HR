import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { DistributionView } from "../DistributionView";

export default async function ValuesDistributionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");
  return <DistributionView dimension="VALUES" title="How are values ratings distributed?" />;
}
