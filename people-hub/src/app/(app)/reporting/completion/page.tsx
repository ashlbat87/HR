import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { CompletionView } from "../CompletionView";

export default async function CompletionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");
  const sp = await searchParams;
  return <CompletionView params={{ cycle: sp.cycle, scope: sp.scope, period: sp.period }} />;
}
